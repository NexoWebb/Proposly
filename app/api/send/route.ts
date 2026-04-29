import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { id, message } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  // Verificar autenticación con el token JWT del header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ownerCheck } = await supabaseAdmin
    .from('proposals')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!ownerCheck || ownerCheck.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: proposal, error: fetchError } = await supabaseAdmin
    .from('proposals')
    .select('title, client_name, client_email')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Error al obtener la propuesta' }, { status: 500 })
  }
  if (!proposal) return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  if (!proposal.client_email) return NextResponse.json({ error: 'El cliente no tiene email configurado' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proposly-kappa.vercel.app'
  const proposalUrl = `${appUrl}/p/${id}`

  // 1. Intentar enviar el email
  const { error: emailError } = await resend.emails.send({
    from: 'Proposly <hola@proposly.es>',
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
        ${message ? `<div style="background:#f8f9fa;border-left:3px solid #ddd;border-radius:6px;padding:14px 18px;margin:0 0 24px"><p style="color:#555;font-size:14px;line-height:1.6;margin:0;font-style:italic">${escapeHtml(message)}</p></div>` : ''}
        <a href="${proposalUrl}" style="display:inline-block;background:#0f0f0f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
          Ver propuesta →
        </a>
        <p style="color:#bbb;font-size:12px;margin-top:32px">
          Si tienes alguna pregunta, responde directamente a este email.
        </p>
      </div>
    `,
  })

  // 2. Si Resend falla, devolver error sin cambiar el estado
  if (emailError) {
    return NextResponse.json({ error: 'Error al enviar el email: ' + emailError.message }, { status: 500 })
  }

  // 3. Email enviado OK → actualizar estado a sent
  const { data: updatedProposal, error: updateError } = await supabaseAdmin
    .from('proposals')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ ok: true, statusError: updateError.message })
  }

  if (!updatedProposal) {
    return NextResponse.json({ ok: true, statusError: 'La fila no se actualizó (ID no encontrado o RLS bloqueando)' })
  }

  return NextResponse.json({ ok: true, updatedStatus: updatedProposal.status })
}
