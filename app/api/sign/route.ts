import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

type ServiceRow = { name: string; price: number; optional?: boolean; selected?: boolean }
type ServiceBlock = { type: 'services'; content: ServiceRow[] }

function computeTotal(blocks: unknown[]): number {
  return (blocks as ServiceBlock[])
    .filter(b => b.type === 'services')
    .flatMap(b => b.content.filter(s => s.selected !== false))
    .reduce((sum, s) => sum + (Number(s.price) || 0), 0)
}

function buildServicesHtml(blocks: unknown[], total: number): string {
  const services = (blocks as ServiceBlock[])
    .filter(b => b.type === 'services')
    .flatMap(b => b.content.filter(s => s.selected !== false))
  if (services.length === 0) return ''
  return `
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      ${services.map(s => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#333">${escapeHtml(String(s.name))}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;white-space:nowrap">${Number(s.price).toLocaleString('es-ES')}€</td>
        </tr>
      `).join('')}
      <tr>
        <td style="padding:12px 0 0;font-size:14px;font-weight:600;color:#0f0f0f">Total sin IVA</td>
        <td style="padding:12px 0 0;font-size:16px;font-weight:600;color:#0f0f0f;text-align:right">${total.toLocaleString('es-ES')}€</td>
      </tr>
    </table>
  `
}

export async function POST(request: NextRequest) {
  const { publicToken, signerName } = await request.json()

  if (!publicToken || !signerName) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const trimmedName = String(signerName).trim()
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
  }

  const { data: proposal, error: fetchError } = await supabaseAdmin
    .from('proposals')
    .select('id, title, client_name, client_email, user_id, blocks, status, expires_at')
    .eq('public_token', publicToken)
    .single()

  if (fetchError || !proposal) return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })

  if (proposal.status === 'signed') return NextResponse.json({ error: 'Ya firmada' }, { status: 409 })
  if (proposal.status === 'draft') return NextResponse.json({ error: 'Propuesta no disponible' }, { status: 403 })
  if (proposal.expires_at && new Date() > new Date(proposal.expires_at)) {
    return NextResponse.json({ error: 'Propuesta caducada' }, { status: 410 })
  }

  const blocks = (proposal.blocks as unknown[]) ?? []
  const computedTotal = computeTotal(blocks)

  const { error: updateError } = await supabaseAdmin
    .from('proposals')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: trimmedName,
      total_amount: computedTotal,
    })
    .eq('id', proposal.id)

  if (updateError) return NextResponse.json({ error: 'Error al firmar' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proposly-kappa.vercel.app'
  const proposalUrl = `${appUrl}/p/${publicToken}`
  const safeClientName = escapeHtml(proposal.client_name ?? '')
  const safeTitle = escapeHtml(proposal.title ?? '')
  const safeSignerName = escapeHtml(trimmedName)
  const servicesHtml = buildServicesHtml(blocks, computedTotal)

  if (proposal.client_email) {
    await resend.emails.send({
      from: 'Proposly <onboarding@resend.dev>',
      to: proposal.client_email,
      subject: `✅ Has aceptado: ${proposal.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
            <div style="width:6px;height:6px;border-radius:50%;background:#a8e063"></div>
            <span style="font-size:14px;font-weight:500">Proposly</span>
          </div>
          <h1 style="font-size:20px;font-weight:400;margin:0 0 8px;font-family:Georgia,serif">
            Confirmación de aceptación
          </h1>
          <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px">
            Hola <strong>${safeClientName}</strong>, has aceptado la propuesta
            <strong>${safeTitle}</strong>. A continuación el resumen de lo acordado:
          </p>
          ${servicesHtml}
          <p style="color:#888;font-size:13px;margin:0 0 8px">Firmado por: <strong style="color:#333">${safeSignerName}</strong></p>
          <p style="color:#888;font-size:13px;margin:0 0 24px">Fecha: <strong style="color:#333">${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
          <a href="${proposalUrl}" style="display:inline-block;background:#0f0f0f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
            Ver propuesta completa →
          </a>
          <p style="color:#bbb;font-size:12px;margin-top:32px">
            Guarda este email como comprobante de tu aceptación.
          </p>
        </div>
      `,
    }).catch(() => {})
  }

  const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(proposal.user_id)
  const ownerEmail = ownerData?.user?.email
  if (ownerEmail) {
    await resend.emails.send({
      from: 'Proposly <onboarding@resend.dev>',
      to: ownerEmail,
      subject: `🎉 ${proposal.client_name} ha aceptado tu propuesta`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
            <div style="width:6px;height:6px;border-radius:50%;background:#a8e063"></div>
            <span style="font-size:14px;font-weight:500">Proposly</span>
          </div>
          <h1 style="font-size:20px;font-weight:400;margin:0 0 8px;font-family:Georgia,serif">
            ¡Propuesta aceptada!
          </h1>
          <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px">
            <strong>${safeClientName}</strong> ha aceptado la propuesta
            <strong>${safeTitle}</strong>. Firmado por: ${safeSignerName}.
          </p>
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#0f0f0f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
            Ver en el dashboard →
          </a>
        </div>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
