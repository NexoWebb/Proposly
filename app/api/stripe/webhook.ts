import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const userId = session.metadata?.user_id
      const customerId = session.customer

      if (!userId) {
        console.error('No user_id in session metadata')
        return NextResponse.json({ ok: true })
      }

      // Obtener subscription ID de Stripe
      const subscription = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      })

      const subscriptionId = subscription.data[0]?.id
      const currentPeriodEnd = subscription.data[0]?.current_period_end

      if (!subscriptionId) {
        console.error('No subscription found for customer')
        return NextResponse.json({ ok: true })
      }

      // Actualizar o insertar en subscriptions
      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscriptionId,
            plan: 'pro',
            status: 'active',
            current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          })
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: 'pro',
            status: 'active',
            current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any
      const customerId = subscription.customer

      // Encontrar user_id por customer_id
      const { data: subData } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (subData) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
          })
          .eq('user_id', subData.user_id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ ok: true }) // Responder 200 para evitar reintentos
  }
}
