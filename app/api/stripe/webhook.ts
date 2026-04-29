import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature') || ''

    let event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const userId = session.metadata?.user_id
      const customerId = session.customer

      if (userId && customerId) {
        const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 })
        const sub = subscriptions.data[0]

        if (sub) {
          const { data: existing } = await supabaseAdmin.from('subscriptions').select('id').eq('user_id', userId).single()

          if (existing) {
            await supabaseAdmin.from('subscriptions').update({ stripe_subscription_id: sub.id, plan: 'pro', status: 'active', current_period_end: new Date(sub.current_period_end * 1000).toISOString() }).eq('user_id', userId)
          } else {
            await supabaseAdmin.from('subscriptions').insert({ user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: sub.id, plan: 'pro', status: 'active', current_period_end: new Date(sub.current_period_end * 1000).toISOString() })
          }
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any
      const { data: subData } = await supabaseAdmin.from('subscriptions').select('user_id').eq('stripe_customer_id', subscription.customer).single()
      if (subData) await supabaseAdmin.from('subscriptions').update({ plan: 'free', status: 'canceled' }).eq('user_id', subData.user_id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
