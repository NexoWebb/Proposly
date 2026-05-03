import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { id, signerName, finalTotal, finalBlocks } = await request.json()
  if (!id || !signerName) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  // Extract optional service selections for dedicated column
  const allOptionals = (finalBlocks ?? [])
    .filter((b: { type: string }) => b.type === 'services')
    .flatMap((b: { content: { name: string; price: number; optional?: boolean; selected?: boolean }[] }) =>
      b.content.filter(s => s.optional)
    )
    .map((s: { name: string; price: number; selected?: boolean }) => ({
      name: s.name,
      price: s.price,
      selected: s.selected !== false,
    }))

  const { data: proposal, error } = await supabaseAdmin
    .from('proposals')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: signerName,
      ...(finalTotal !== undefined ? { total_amount: finalTotal } : {}),
      ...(finalBlocks !== undefined ? { blocks: finalBlocks } : {}),
      ...(allOptionals.length > 0 ? { signed_selections: allOptionals } : {}),
    })
    .eq('id', id)
    .select('title, client_name, client_email, user_id')
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Error al firmar' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proposly-kappa.vercel.app'
  const proposalUrl = `${appUrl}/p/${id}`

  // Construir resumen de servicios desde los bloques firmados
  type SvcLine = { name: string; price: number; optional?: boolean; selected?: boolean }
  const serviceBlocks = (finalBlocks ?? []).filter((b: { type: string }) => b.type === 'services')
  const allServices: SvcLine[] = serviceBlocks.flatMap((b: { content: SvcLine[] }) => b.content)
  const baseServices = allServices.filter(s => !s.optional)
  const optServices  = allServices.filter(s => s.optional)
  const acceptedOpts = optServices.filter(s => s.selected !== false)
  const rejectedOpts = optServices.filter(s => s.selected === false)

  const rowHtml = (s: SvcLine, dim = false) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:${dim ? '#aaa' : '#333'};text-decoration:${dim ? 'line-through' : 'none'}">${s.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:${dim ? '#aaa' : '#333'};text-align:right;white-space:nowrap;text-decoration:${dim ? 'line-through' : 'none'}">${Number(s.price).toLocaleString('es-ES')}€</td>
    </tr>`

  const servicesHtml = allServices.length > 0
    ? `
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        ${baseServices.map(s => rowHtml(s)).join('')}
        ${acceptedOpts.length > 0 ? `
          <tr><td colspan="2" style="padding:10px 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Opcionales incluidos</td></tr>
          ${acceptedOpts.map(s => rowHtml(s)).join('')}
        ` : ''}
        ${rejectedOpts.length > 0 ? `
          <tr><td colspan="2" style="padding:10px 0 4px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px">Opcionales no incluidos</td></tr>
          ${rejectedOpts.map(s => rowHtml(s, true)).join('')}
        ` : ''}
        <tr>
          <td style="padding:12px 0 0;font-size:14px;font-weight:600;color:#0f0f0f">Total sin IVA</td>
          <td style="padding:12px 0 0;font-size:16px;font-weight:600;color:#0f0f0f;text-align:right">${Number(finalTotal ?? 0).toLocaleString('es-ES')}€</td>
        </tr>
      </table>
    `
    : ''

  // Email al cliente — confirmación con resumen
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
            Hola <strong>${proposal.client_name}</strong>, has aceptado la propuesta
            <strong>${proposal.title}</strong>. A continuación el resumen de lo acordado:
          </p>
          ${servicesHtml}
          <p style="color:#888;font-size:13px;margin:0 0 8px">Firmado por: <strong style="color:#333">${signerName}</strong></p>
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

  // Email al dueño — notificación de firma
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
            <strong>${proposal.client_name}</strong> ha aceptado la propuesta
            <strong>${proposal.title}</strong>. Firmado por: ${signerName}.
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
