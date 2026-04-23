import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { id } = await request.json()

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .select('opened_at, opened_count, title, client_name, user_id')
    .eq('id', id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const yaAbierta = proposal.opened_count > 0

  await supabase
    .from('proposals')
    .update({
      status: 'opened',
      opened_at: proposal.opened_at ?? new Date().toISOString(),
      opened_count: (proposal.opened_count ?? 0) + 1,
    })
    .eq('id', id)

  if (!yaAbierta) {
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Proposly <onboarding@resend.dev>',
      to: 'yudegoadrian@gmail.com',
      subject: `Tu cliente abrió la propuesta`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
            <div style="width:6px;height:6px;border-radius:50%;background:#a8e063"></div>
            <span style="font-size:14px;font-weight:500">Proposly</span>
          </div>
          <h1 style="font-size:20px;font-weight:400;margin:0 0 8px;font-family:Georgia,serif">
            Tu cliente abrió la propuesta
          </h1>
          <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px">
            <strong>${proposal.client_name}</strong> acaba de abrir la propuesta <strong>${proposal.title}</strong>.
            Es el momento perfecto para hacer seguimiento.
          </p>
          <a href="http://localhost:3000/dashboard" style="background:#0f0f0f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">
            Ver en el dashboard →
          </a>
          <p style="color:#bbb;font-size:12px;margin-top:32px">
            Solo te avisamos la primera vez que se abre.
          </p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true })
}