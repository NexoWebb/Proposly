import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// En API >= 2026-04-22.dahlia, current_period_end vive en items.data[0]
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts =
    sub.items?.data?.[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null
  return ts ? new Date(ts * 1000).toISOString() : null
}

async function getUserByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.user_id ?? null
}

export async function POST(request: NextRequest) {
  // --- Verificar firma --- devuelve 400 si inválida (Stripe no reintenta 4xx)
  let event: Stripe.Event
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature') ?? ''
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Stripe] constructEvent failed:', msg)
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  console.log(`[Stripe] Event received: ${event.type} ${event.id}`)

  // --- Idempotencia: INSERT falla con 23505 si el evento ya fue procesado ---
  const { error: idempotencyErr } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({ id: event.id })

  if (idempotencyErr) {
    if (idempotencyErr.code === '23505') {
      console.log(`[Stripe] Duplicate event ${event.id}, skipping`)
      return NextResponse.json({ ok: true })
    }
    // Error de BD distinto — logueamos pero no bloqueamos el handler
    console.warn(`[Stripe] Could not record event ${event.id}:`, idempotencyErr.message)
  }

  // --- Handlers — siempre 200 para que Stripe no reintente ---
  try {

    // ── checkout.session.completed ────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const customerId = typeof session.customer === 'string' ? session.customer : null

      console.log(`[Stripe] checkout.session.completed — userId=${userId} customerId=${customerId}`)

      if (userId && customerId) {
        const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 })
        const sub = subscriptions.data[0]
        console.log(`[Stripe] Subscription found: ${sub?.id ?? 'none'}`)

        if (sub) {
          const payload = {
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan: 'pro' as const,
            status: 'active',
            current_period_end: getPeriodEnd(sub),
          }

          const { data: existing } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .single()

          if (existing) {
            const { error } = await supabaseAdmin
              .from('subscriptions')
              .update(payload)
              .eq('user_id', userId)
            if (error) console.error('[Stripe] update failed:', error.message)
            else console.log(`[Stripe] Subscription updated for user ${userId}`)
          } else {
            const { error } = await supabaseAdmin
              .from('subscriptions')
              .insert({ user_id: userId, ...payload })
            if (error) console.error('[Stripe] insert failed:', error.message)
            else console.log(`[Stripe] Subscription inserted for user ${userId}`)
          }
        }
      }
    }

    // ── customer.subscription.updated ────────────────────────────────────
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : null
      if (customerId) {
        const userId = await getUserByCustomer(customerId)
        if (userId) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: sub.status,
              current_period_end: getPeriodEnd(sub),
              cancel_at_period_end: sub.cancel_at_period_end,
            })
            .eq('user_id', userId)
          if (error) console.error('[Stripe] subscription.updated failed:', error.message)
          else console.log(`[Stripe] subscription.updated — user ${userId} status=${sub.status}`)
        }
      }
    }

    // ── customer.subscription.deleted ────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : null
      if (customerId) {
        const userId = await getUserByCustomer(customerId)
        if (userId) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({ plan: 'free', status: 'canceled' })
            .eq('user_id', userId)
          if (error) console.error('[Stripe] subscription.deleted failed:', error.message)
          else console.log(`[Stripe] subscription.deleted — user ${userId} → free`)
        }
      }
    }

    // ── invoice.payment_failed ────────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
      if (customerId) {
        const userId = await getUserByCustomer(customerId)
        if (userId) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('user_id', userId)
          if (error) console.error('[Stripe] invoice.payment_failed update failed:', error.message)
          else console.log(`[Stripe] invoice.payment_failed — user ${userId} → past_due`)
        }
      }
    }

    // ── invoice.payment_succeeded ─────────────────────────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
      if (customerId) {
        const userId = await getUserByCustomer(customerId)
        if (userId) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('user_id', userId)
          if (error) console.error('[Stripe] invoice.payment_succeeded update failed:', error.message)
          else console.log(`[Stripe] invoice.payment_succeeded — user ${userId} → active`)
        }
      }
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[Stripe] Handler error:', msg, '\n', stack)
    return NextResponse.json({ ok: true })
  }
}
