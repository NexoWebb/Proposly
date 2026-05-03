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

  // Leer tax config antes del update para calcular el total neto correcto
  const { data: taxConfig } = await supabaseAdmin
    .from('proposals')
    .select('vat_rate, irpf_enabled, irpf_rate')
    .eq('id', id)
    .single()

  const subtotal = Number(finalTotal ?? 0)
  const vatRate = taxConfig?.vat_rate ?? '21'
  const irpfEnabled = taxConfig?.irpf_enabled ?? false
  const irpfRate = taxConfig?.irpf_rate ?? '15'
  const vatNum = ['21','10','4'].includes(vatRate) ? Number(vatRate) : 0
  const irpfNum = irpfEnabled ? Number(irpfRate) : 0
  const vatAmount = Math.round(subtotal * vatNum) / 100
  const irpfAmount = Math.round(subtotal * irpfNum) / 100
  const grandTotal = subtotal + vatAmount - irpfAmount

  const { data: proposal, error } = await supabaseAdmin
    .from('proposals')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: signerName,
      total_amount: grandTotal,
      signed_subtotal: subtotal,
      signed_vat_amount: vatAmount,
      signed_irpf_amount: irpfAmount,
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
  const fmtEur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

  const vatLabel = vatRate === 'exempt' ? 'IVA (Exento)' : vatRate === 'isp' ? 'IVA (ISP)' : `IVA (${vatRate}%)`
  const vatValue = vatRate === 'exempt' ? '0,00 €' : vatRate === 'isp' ? '—' : fmtEur(vatAmount)

  const taxSummaryHtml = `
    <tr><td colspan="2" style="padding:12px 0 6px"><hr style="border:none;border-top:1px solid #eee;margin:0"/></td></tr>
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#666">Subtotal</td>
      <td style="padding:4px 0;font-size:13px;color:#666;text-align:right;white-space:nowrap">${fmtEur(subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#666">${vatLabel}</td>
      <td style="padding:4px 0;font-size:13px;color:#666;text-align:right;white-space:nowrap">${vatValue}</td>
    </tr>
    ${irpfEnabled ? `<tr>
      <td style="padding:4px 0;font-size:13px;color:#666">IRPF (-${irpfRate}%)</td>
      <td style="padding:4px 0;font-size:13px;color:#c0392b;text-align:right;white-space:nowrap">-${fmtEur(irpfAmount)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#0f0f0f">Total</td>
      <td style="padding:10px 0 0;font-size:18px;font-weight:700;color:#0f0f0f;text-align:right">${fmtEur(grandTotal)}</td>
    </tr>
  `

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
        ${taxSummaryHtml}
      </table>
    `
    : `<table style="width:100%;border-collapse:collapse;margin:0 0 20px">${taxSummaryHtml}</table>`

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
