import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { notFound } from 'next/navigation'
import type { Block } from '@/components/BlockEditor'
import InteractiveProposal from '@/components/InteractiveProposal'
import { trackProposal } from '@/lib/trackProposal'

export const dynamic = 'force-dynamic'

export default async function ProposalPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ export?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const autoExport = sp.export === 'true'

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !proposal) notFound()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, logo_url, fiscal_name, fiscal_id, fiscal_address, fiscal_city')
    .eq('user_id', proposal.user_id)
    .single()

  const expired = !!(proposal.expires_at && new Date() > new Date(proposal.expires_at))

  if (!expired && !autoExport && proposal.status !== 'signed') {
    await trackProposal(id).catch(() => {})
  }

  const blocks: Block[] = proposal.blocks ?? []

  const hasLogo = !!profile?.logo_url
  const hasName = !!profile?.name

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div id="proposal-content" style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Georgia', serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .proposal-header { padding: 32px 20px 28px !important; }
          .proposal-header h1 { font-size: 24px !important; }
          .proposal-content { padding: 28px 20px !important; }
        }
      `}</style>

      {/* Cabecera */}
      <div className="proposal-header" style={{ background: '#4F6EF7', padding: '64px 24px 48px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>

          {/* Brand row — 4 edge cases */}
          {(hasLogo || hasName) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
              {hasLogo && (
                <img src={profile!.logo_url!} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
              )}
              {hasName && (
                <span style={{
                  color: hasLogo ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {!hasLogo && (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7', flexShrink: 0, display: 'inline-block' }} />
                  )}
                  {profile!.name}
                </span>
              )}
            </div>
          )}

          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '400', margin: '0 0 12px', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
            {proposal.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: 0, fontFamily: 'sans-serif' }}>
            Preparada para {proposal.client_name || 'ti'}
          </p>
          {!expired && proposal.expires_at && proposal.status !== 'signed' && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '6px 0 0', fontFamily: 'sans-serif' }}>
              Válida hasta {fmtDate(proposal.expires_at)}
            </p>
          )}
        </div>
      </div>

      <InteractiveProposal
        initialBlocks={blocks}
        proposalId={id}
        signed={proposal.status === 'signed'}
        autoExport={autoExport}
        vatRate={proposal.vat_rate ?? '21'}
        irpfEnabled={proposal.irpf_enabled ?? false}
        irpfRate={proposal.irpf_rate ?? '15'}
        emisor={
          (profile?.fiscal_name || profile?.fiscal_id || profile?.fiscal_address)
            ? { fiscalName: profile?.fiscal_name ?? '', fiscalId: profile?.fiscal_id ?? '', fiscalAddress: profile?.fiscal_address ?? '', fiscalCity: profile?.fiscal_city ?? '' }
            : null
        }
        cliente={
          (proposal.client_fiscal_name || proposal.client_fiscal_id || proposal.client_fiscal_address)
            ? { fiscalName: proposal.client_fiscal_name ?? '', fiscalId: proposal.client_fiscal_id ?? '', fiscalAddress: proposal.client_fiscal_address ?? '' }
            : null
        }
        proposalTitle={proposal.title ?? ''}
        clientName={proposal.client_name ?? ''}
        expired={expired}
        expiresAt={proposal.expires_at ?? null}
        signedAt={proposal.signed_at ?? null}
        signerName={proposal.signer_name ?? null}
      />
    </div>
  )
}
