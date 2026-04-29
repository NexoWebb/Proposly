import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const products = await stripe.products.list({ limit: 1 })
    return NextResponse.json({ ok: true, products: products.data.length })
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 })
  }
}
