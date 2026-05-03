import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('KEY:', process.env.STRIPE_SECRET_KEY?.slice(0, 10))
  console.log('PRICE:', process.env.STRIPE_PRO_PRICE_ID)

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Obtener o crear suscripción del usuario
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (customerId) {
      console.log(`[Stripe] Reusing customer from DB: ${customerId}`)
    } else {
      // Buscar en Stripe por email antes de crear uno nuevo
      const existing = await stripe.customers.list({ email: user.email!, limit: 1 })
      if (existing.data.length > 0) {
        customerId = existing.data[0].id
        console.log(`[Stripe] Reusing customer found in Stripe: ${customerId}`)
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_uid: user.id },
        })
        customerId = customer.id
        console.log(`[Stripe] Created new Stripe customer: ${customerId}`)
      }

      // Guardar en BD inmediatamente — no esperar al webhook
      const { error: upsertErr } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          { user_id: user.id, stripe_customer_id: customerId, plan: 'free', status: 'active' },
          { onConflict: 'user_id' }
        )
      if (upsertErr) console.error('[Stripe] Failed to save customer to DB:', upsertErr.message)
    }

    // Crear sesión de checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proposly-kappa.vercel.app'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?payment=success`,
      cancel_url: `${appUrl}/dashboard?payment=canceled`,
      metadata: { user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
