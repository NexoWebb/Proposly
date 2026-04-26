import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data: proposal } = await supabase
    .from('proposals')
    .select('title, client_name, client_email')
    .eq('id', id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  if (!proposal.client_email) return NextResponse.json({ error: 'El cliente no tiene email' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proposly-kappa.vercel.app'
  const proposalUrl = `${appUrl}/p/${id}`

  const { error } = await resend.emails.send({
    from: 'Proposly <onboarding@resend.dev>',
    to: proposal.client_email,
    subject: `${proposal.title} — tu propuesta está lista`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
          <div style="width:6px;height:6px;border-radius:50%;background:#a8e063"></div>
          <span style="font-size:14px;font-weight:500">Proposly</span>
        </div>
        <h1 style="font-size:20px;font-weight:400;margin:0 0 8px;font-family:Georgia,serif">
          Hola, ${proposal.client_name}
        </h1>
        <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px">
          Tienes una nueva propuesta lista para revisar: <strong>${proposal.title}</strong>.
        </p>
        <a href="${proposalUrl}" style="display:inline-block;background:#0f0f0f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
          Ver propuesta →
        </a>
        <p style="color:#bbb;font-size:12px;margin-top:32px">
          Si tienes alguna pregunta, responde directamente a este email.
        </p>
      </div>
    `,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('proposals')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
