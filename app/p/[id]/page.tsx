import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { notFound } from 'next/navigation'
import AcceptButton from '@/components/AcceptButton'
import { trackProposal } from '@/lib/trackProposal'
import type { Block } from '@/components/BlockEditor'

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

      <div className="proposal-content" style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>

        {blocks.map((block: Block, i: number) => {
          if (block.type === 'header') {
            return (
              <h2 key={i} style={{ fontSize: '22px', fontWeight: '400', color: '#0F172A', margin: '32px 0 16px', letterSpacing: '-0.3px' }}>
                {block.content}
              </h2>
            )
          }
          if (block.type === 'text' || block.type === 'intro') {
            return (
              <p key={i} style={{ fontSize: '16px', color: '#334155', lineHeight: '1.8', margin: '0 0 20px', fontStyle: 'italic' }}>
                {block.content as string}
              </p>
            )
          }
          if (block.type === 'image') {
            return (
              <div key={i} style={{ margin: '24px 0' }}>
                <img src={block.url} alt={block.caption} style={{ width: '100%', borderRadius: '10px', display: 'block' }} />
                {block.caption && (
                  <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '8px 0 0', fontFamily: 'sans-serif', fontStyle: 'normal' }}>
                    {block.caption}
                  </p>
                )}
              </div>
            )
          }
          if (block.type === 'separator') {
            return <div key={i} style={{ height: '1px', background: '#E2E8F0', margin: '32px 0' }} />
          }
          if (block.type === 'services') {
            const svcTotal = block.content.reduce((sum, s) => sum + Number(s.price), 0)
            return (
              <div key={i} style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '20px' }}>
                  Servicios incluidos
                </p>
                {block.content.map((service, si) => (
                  <div key={si} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '15px', color: '#1E293B', fontFamily: 'sans-serif' }}>{service.name}</span>
                    <span style={{ fontSize: '15px', color: '#1E293B', fontWeight: '500', fontFamily: 'sans-serif' }}>
                      {Number(service.price).toLocaleString('es-ES')}€
                    </span>
                  </div>
                ))}
                <div className="proposal-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#1C2B5E', borderRadius: '12px', marginTop: '20px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>Total sin IVA</span>
                  <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '400', letterSpacing: '-0.5px' }}>
                    {svcTotal.toLocaleString('es-ES')}€
                  </span>
                </div>
              </div>
            )
          }
          return null
        })}

        {total > 0 && blocks.filter(b => b.type === 'services').length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#0F172A', borderRadius: '12px', margin: '8px 0 32px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>Total global sin IVA</span>
            <span style={{ color: '#ffffff', fontSize: '26px', fontWeight: '400', letterSpacing: '-0.5px' }}>
              {total.toLocaleString('es-ES')}€
            </span>
          </div>
        )}

        <div style={{ height: '1px', background: '#E2E8F0', margin: '32px 0' }} />

        <AcceptButton proposalId={id} signed={proposal.status === 'signed'} />

      </div>
    </div>
  )
}
