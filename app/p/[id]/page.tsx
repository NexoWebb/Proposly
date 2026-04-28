import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { notFound } from 'next/navigation'
import type { Block } from '@/components/BlockEditor'
import InteractiveProposal from '@/components/InteractiveProposal'
import { trackProposal } from '@/lib/trackProposal'

export const dynamic = 'force-dynamic'

export default async function ProposalPublicPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !proposal) notFound()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, logo_url')
    .eq('user_id', proposal.user_id)
    .single()

  if (proposal.status !== 'signed') {
    // trackProposal is removed temporarily or we need to import it. Let's re-import it above.
    await trackProposal(id).catch(() => {})
  }

  const blocks: Block[] = proposal.blocks ?? []
  const total = blocks
    .filter((b: Block) => b.type === 'services')
    .flatMap((b: Block) => (b as Extract<Block, { type: 'services' }>).content)
    .reduce((sum, s) => sum + Number(s.price), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: "'Georgia', serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .proposal-header { padding: 32px 20px 28px !important; }
          .proposal-header h1 { font-size: 24px !important; }
          .proposal-content { padding: 28px 20px !important; }
          .proposal-total { padding: 16px !important; }
        }
      `}</style>

      {/* Cabecera navy */}
      <div className="proposal-header" style={{ background: '#1C2B5E', padding: '64px 24px 48px' }}>
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
      />
    </div>
  )
}
