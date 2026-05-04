import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

export async function trackProposal(publicToken: string): Promise<void> {
  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, opened_at, opened_count, title, client_name, user_id, status, expires_at')
    .eq('public_token', publicToken)
    .single()

  if (!proposal) return
  if (proposal.status === 'signed') return
  if (proposal.expires_at && new Date() > new Date(proposal.expires_at)) return

  const yaAbierta = (proposal.opened_count ?? 0) > 0

  await supabaseAdmin
    .from('proposals')
    .update({
      status: 'opened',
      opened_at: proposal.opened_at ?? new Date().toISOString(),
      opened_count: (proposal.opened_count ?? 0) + 1,
    })
    .eq('id', proposal.id)

  if (!yaAbierta) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proposly-kappa.vercel.app'

    const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(proposal.user_id)
    const ownerEmail = ownerData?.user?.email
    if (!ownerEmail) return

    await resend.emails.send({
      from: 'Proposly <hola@proposly.es>',
      to: ownerEmail,
      subject: `👀 Tu propuesta está siendo leída ahora`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
            <div style="width:6px;height:6px;border-radius:50%;background:#a8e063"></div>
            <span style="font-size:14px;font-weight:500">Proposly</span>
          </div>
          <h1 style="font-size:20px;font-weight:400;margin:0 0 8px;font-family:Georgia,serif">
            Tu propuesta está siendo leída ahora
          </h1>
          <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px">
            <strong>${escapeHtml(proposal.client_name ?? '')}</strong> acaba de abrir la propuesta <strong>${escapeHtml(proposal.title ?? '')}</strong>.
            Es el momento perfecto para hacer seguimiento.
          </p>
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#0f0f0f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">
            Ver en el dashboard →
          </a>
          <p style="color:#bbb;font-size:12px;margin-top:32px">
            Solo te avisamos la primera vez que se abre.
          </p>
        </div>
      `,
    })
  }
}
