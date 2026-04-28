'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import UserLogo from '@/components/UserLogo'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const pageBg = '#F5F0EB'
const ink = '#1A1208'
const mid = '#8C7B6B'
const border = '#DDD5C8'
const cream = '#FAF7F3'
const accent = '#C4A882'
const cardBg = 'rgba(250,247,243,0.8)'

type Proposal = {
  id: string; title: string; client_name: string; status: string
  total_amount: number; created_at: string; sent_at: string | null; signed_at: string | null
}

const fmt = (d: string | null) => d ? new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

const statusLabel: Record<string, string> = { draft: 'Borrador', sent: 'Enviada', opened: 'Abierta', signed: 'Firmada' }
const statusColor: Record<string, string> = { draft: '#B8A898', sent: '#C4A882', opened: '#D4854A', signed: '#6B8F5E' }
const statusBg: Record<string, string> = { draft: '#F0EBE5', sent: '#F5ECD8', opened: '#FAE8DA', signed: '#E8F0E5' }

function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/p/${id}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handleCopy}
      style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: copied ? '#6B8F5E' : mid, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'color 0.2s' }}>
      {copied ? '✓ Copiado' : 'Copiar link'}
    </button>
  )
}

type FilterKey = 'all' | 'sent' | 'opened' | 'signed' | 'draft'
type Tab = 'proposals' | 'stats'

export default function DashboardPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [tab, setTab] = useState<Tab>('proposals')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('proposals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!cancelled && !error && data) setProposals(data)
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sent = proposals.filter(p => p.status === 'sent').length
  const opened = proposals.filter(p => p.status === 'opened').length
  const signed = proposals.filter(p => p.status === 'signed').length
  const everSent = proposals.filter(p => p.sent_at !== null).length

  const stats = [
    { label: 'Total', key: 'all' as FilterKey, value: proposals.length, color: accent },
    { label: 'Borradores', key: 'draft' as FilterKey, value: proposals.filter(p => p.status === 'draft').length, color: '#B8A898' },
    { label: 'Abiertas', key: 'opened' as FilterKey, value: opened, color: '#D4854A', sub: 'Pendientes de firma' },
    { label: 'Firmadas', key: 'signed' as FilterKey, value: signed, color: '#6B8F5E' },
  ]

  const filtered = filter === 'all' ? proposals : proposals.filter(p => p.status === filter)

  const barData = (() => {
    const months: { mes: string; propuestas: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ mes: d.toLocaleDateString('es-ES', { month: 'short' }), propuestas: proposals.filter(p => p.created_at.startsWith(key)).length })
    }
    return months
  })()

  const donutData = [
    { name: 'Borrador', value: proposals.filter(p => p.status === 'draft').length, color: '#B8A898' },
    { name: 'Enviada', value: sent, color: '#C4A882' },
    { name: 'Abierta', value: opened, color: '#D4854A' },
    { name: 'Firmada', value: signed, color: '#6B8F5E' },
  ].filter(d => d.value > 0)

  const totalSent = everSent
  const apertura = totalSent > 0 ? Math.round((opened + signed) / totalSent * 100) : 0
  const conversion = (opened + signed) > 0 ? Math.round(signed / (opened + signed) * 100) : 0
  const importeFirmado = proposals.filter(p => p.status === 'signed').reduce((s, p) => s + Number(p.total_amount), 0)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('¿Seguro que quieres eliminar esta propuesta?')) return
    await supabase.from('proposals').delete().eq('id', id)
    setProposals(prev => prev.filter(p => p.id !== id))
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', color: ink }}>

      {/* Topbar */}
      <div style={{
        background: 'rgba(26,18,8,0.95)', backdropFilter: 'blur(12px)',
        padding: `0 ${isMobile ? '16px' : '40px'}`, display: 'flex', alignItems: 'center', height: '56px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <UserLogo />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/settings" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', textDecoration: 'none', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)' }}>
            Ajustes
          </a>
          <button onClick={handleSignOut}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }}>
            {isMobile ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: isMobile ? '24px 16px' : '48px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: '400', color: ink, margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Tus propuestas</h1>
            <p style={{ fontSize: '13px', color: mid, margin: 0 }}>Gestiona y haz seguimiento de todas tus propuestas</p>
          </div>
          <button onClick={() => router.push('/editor')}
            style={{ background: ink, color: cream, border: 'none', padding: '10px 22px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
            + Nueva propuesta
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(196,168,130,0.12)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
          {(['proposals', 'stats'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? cream : 'transparent', border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: tab === t ? ink : mid, cursor: 'pointer', transition: 'all 0.15s', boxShadow: tab === t ? '0 1px 4px rgba(26,18,8,0.08)' : 'none' }}>
              {t === 'proposals' ? 'Propuestas' : 'Estadísticas'}
            </button>
          ))}
        </div>

        {tab === 'proposals' && (
          <>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: '12px', marginBottom: '24px' }}>
              {stats.map(stat => (
                <div key={stat.key} onClick={() => setFilter(stat.key)}
                  style={{
                    background: filter === stat.key ? ink : cardBg,
                    border: `1px solid ${filter === stat.key ? ink : border}`,
                    borderRadius: '16px', padding: '20px', cursor: 'pointer',
                    transition: 'all 0.15s',
                    backdropFilter: 'blur(8px)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: filter === stat.key ? 'rgba(255,255,255,0.4)' : stat.color }} />
                    <p style={{ fontSize: '10px', color: filter === stat.key ? 'rgba(255,255,255,0.5)' : mid, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>{stat.label}</p>
                  </div>
                  <p style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '400', color: filter === stat.key ? cream : ink, margin: '0 0 4px', fontFamily: 'Georgia, serif', lineHeight: 1 }}>{stat.value}</p>
                  {stat.sub && <p style={{ fontSize: '10px', color: filter === stat.key ? 'rgba(255,255,255,0.35)' : '#B8A898', margin: 0 }}>{stat.sub}</p>}
                </div>
              ))}
            </div>

            {/* Lista */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '11px', color: mid, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {filter === 'all' ? 'Todas las propuestas' : `${statusLabel[filter]}s`}
                </p>
                {filter !== 'all' && (
                  <button onClick={() => setFilter('all')} style={{ background: 'none', border: 'none', fontSize: '11px', color: accent, cursor: 'pointer', textDecoration: 'underline' }}>Ver todas</button>
                )}
              </div>

              {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: mid, fontSize: '14px' }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ color: mid, fontSize: '14px', marginBottom: '20px' }}>
                    {filter === 'all' ? 'Todavía no tienes propuestas' : `No hay propuestas ${statusLabel[filter]?.toLowerCase()}s`}
                  </p>
                  {filter === 'all' && (
                    <button onClick={() => router.push('/editor')} style={{ background: ink, color: cream, border: 'none', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }}>
                      Crear primera propuesta
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((proposal, index) => (
                  <div key={proposal.id}
                    style={{ padding: isMobile ? '14px 16px' : '16px 24px', borderBottom: index < filtered.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'background 0.1s' }}
                    onClick={() => router.push(proposal.status === 'signed' ? `/p/${proposal.id}` : `/editor/${proposal.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = `rgba(196,168,130,0.08)`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    {/* Status badge */}
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: statusBg[proposal.status], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[proposal.status] }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: ink, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proposal.title}</p>
                      <p style={{ fontSize: '12px', color: mid, margin: 0 }}>{proposal.client_name}</p>
                    </div>

                    {!isMobile && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px' }}>
                        <span style={{ fontSize: '11px', color: '#B8A898' }}>Creada {fmt(proposal.created_at)}</span>
                        {fmt(proposal.signed_at) && <span style={{ fontSize: '11px', color: '#6B8F5E' }}>Firmada {fmt(proposal.signed_at)}</span>}
                      </div>
                    )}

                    <span style={{ fontSize: '11px', color: statusColor[proposal.status], background: statusBg[proposal.status], padding: '3px 10px', borderRadius: '20px', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {statusLabel[proposal.status]}
                    </span>

                    <span style={{ fontSize: '14px', fontWeight: '500', color: ink, minWidth: '70px', textAlign: 'right', flexShrink: 0 }}>
                      {Number(proposal.total_amount).toLocaleString('es-ES')}€
                    </span>

                    <CopyLinkButton id={proposal.id} />

                    {proposal.status !== 'signed' && (
                      <button onClick={e => handleDelete(e, proposal.id)}
                        style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', color: '#C4624A', cursor: 'pointer', flexShrink: 0 }}>
                        Eliminar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'stats' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Tasa de apertura', value: `${apertura}%`, sub: `${opened + signed} de ${totalSent}`, color: '#D4854A' },
                { label: 'Tasa de firma', value: `${conversion}%`, sub: `${signed} de ${opened + signed}`, color: accent },
                { label: 'Importe firmado', value: `${importeFirmado.toLocaleString('es-ES')}€`, sub: `${signed} propuesta${signed !== 1 ? 's' : ''}`, color: '#6B8F5E', span: isMobile },
              ].map(k => (
                <div key={k.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', backdropFilter: 'blur(8px)', gridColumn: k.span ? '1 / -1' : 'auto' }}>
                  <p style={{ fontSize: '10px', color: mid, margin: '0 0 12px', letterSpacing: '1px', textTransform: 'uppercase' }}>{k.label}</p>
                  <p style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: '400', color: k.color, margin: '0 0 4px', fontFamily: 'Georgia, serif', lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: '11px', color: '#B8A898', margin: 0 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {proposals.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', backdropFilter: 'blur(8px)' }}>
                  <p style={{ fontSize: '11px', color: mid, margin: '0 0 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Propuestas por mes</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={18}>
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#B8A898' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#B8A898' }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '10px', border: `1px solid ${border}`, background: cream }} cursor={{ fill: 'rgba(196,168,130,0.1)' }} />
                      <Bar dataKey="propuestas" fill={accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', backdropFilter: 'blur(8px)' }}>
                  <p style={{ fontSize: '11px', color: mid, margin: '0 0 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Distribución por estado</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '10px', border: `1px solid ${border}`, background: cream }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ color: mid, fontSize: '14px', margin: 0 }}>Crea tu primera propuesta para ver estadísticas</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}