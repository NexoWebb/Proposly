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

  const expired = proposal.expires_at && new Date() > new Date(proposal.expires_at)

  if (!expired && !autoExport && proposal.status !== 'signed') {
    await trackProposal(id).catch(() => {})
  }

  if (expired) {
    const expiryDate = new Date(proposal.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '56px', marginBottom: '24px' }}>⏰</div>
          <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#1A1208', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>Esta propuesta ha caducado</h1>
          <p style={{ fontSize: '14px', color: '#8C7B6B', margin: '0 0 8px' }}>La fecha de validez era el <strong style={{ color: '#1A1208' }}>{expiryDate}</strong>.</p>
          <p style={{ fontSize: '14px', color: '#8C7B6B', margin: 0 }}>Contacta con nosotros para recibir una propuesta actualizada.</p>
        </div>
      </div>
    )
  }

  const blocks: Block[] = proposal.blocks ?? []
  const total = blocks
    .filter((b: Block) => b.type === 'services')
    .flatMap((b: Block) => (b as Extract<Block, { type: 'services' }>).content)
    .reduce((sum, s) => sum + Number(s.price), 0)

  return (
    <div id="proposal-content" style={{ minHeight: '100vh', background: '#D6E8F5', fontFamily: "'Georgia', serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .proposal-header { padding: 32px 20px 28px !important; }
          .proposal-header h1 { font-size: 24px !important; }
          .proposal-content { padding: 28px 20px !important; }
          .proposal-total { padding: 16px !important; }
        }
      `}</style>

      {/* Cabecera navy */}
      <div className="proposal-header" style={{ background: '#4A7FA5', padding: '64px 24px 48px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
              : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    {profile?.name ?? 'Propuesta comercial'}
                  </span>
                </div>
              )
            }
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '400', margin: '0 0 12px', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
            {proposal.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: 0, fontFamily: 'sans-serif' }}>
            Preparada para {proposal.client_name}
          </p>
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
      />
    </div>
  )
}
