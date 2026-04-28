'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import UserLogo from '@/components/UserLogo'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const bg = '#F5F0EB'
const ink = '#1A1208'
const mid = '#8C7B6B'
const border = '#DDD5C8'
const cream = '#FAF7F3'
const accent = '#C4A882'

type Proposal = {
  id: string
  title: string
  client_name: string
  status: string
  total_amount: number
  created_at: string
  sent_at: string | null
  signed_at: string | null
}

const fmt = (date: string | null) =>
  date ? new Date(date).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

const statusLabel: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', opened: 'Abierta', signed: 'Firmada',
}

const statusColor: Record<string, string> = {
  draft: '#B8A898', sent: '#C4A882', opened: '#D4854A', signed: '#6B8F5E',
}

function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/p/${id}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handleCopy}
      style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: copied ? '#6B8F5E' : mid, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
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

  const stats: { label: string; key: FilterKey; value: number; sub?: string }[] = [
    { label: 'Total', key: 'all', value: proposals.length },
    { label: 'Borradores', key: 'draft', value: proposals.filter(p => p.status === 'draft').length },
    { label: 'Abiertas', key: 'opened', value: opened, sub: 'Pendientes de firma' },
    { label: 'Firmadas', key: 'signed', value: signed },
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

  const tabStyle = (t: Tab): React.CSSProperties => ({
    background: 'none', border: 'none', padding: '10px 0', fontSize: '14px', fontWeight: '500',
    color: tab === t ? ink : mid, cursor: 'pointer',
    borderBottom: tab === t ? `2px solid ${ink}` : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'sans-serif', color: ink }}>

      <div style={{ background: ink, padding: `0 ${isMobile ? '16px' : '40px'}`, display: 'flex', alignItems: 'center', height: '56px' }}>
        <UserLogo />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/settings" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
            Ajustes
          </a>
          <button onClick={handleSignOut}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            {isMobile ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '24px 16px' : '48px 24px' }}>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: '400', color: ink, margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
              Tus propuestas
            </h1>
            <p style={{ fontSize: '13px', color: mid, margin: 0 }}>Gestiona y haz seguimiento de todas tus propuestas</p>
          </div>
          <button onClick={() => router.push('/editor')}
            style={{ background: ink, color: cream, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
            + Nueva propuesta
          </button>
        </div>

        <div style={{ display: 'flex', gap: '24px', borderBottom: `1px solid ${border}`, marginBottom: '24px' }}>
          <button style={tabStyle('proposals')} onClick={() => setTab('proposals')}>Propuestas</button>
          <button style={tabStyle('stats')} onClick={() => setTab('stats')}>Estadísticas</button>
        </div>

        {tab === 'proposals' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: '12px', marginBottom: '24px' }}>
              {stats.map(stat => (
                <div key={stat.key} onClick={() => setFilter(stat.key)}
                  style={{ background: filter === stat.key ? ink : cream, border: `1px solid ${filter === stat.key ? ink : border}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: '10px', color: filter === stat.key ? 'rgba(255,255,255,0.5)' : mid, margin: '0 0 6px', letterSpacing: '1px', textTransform: 'uppercase' }}>{stat.label}</p>
                  <p style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '400', color: filter === stat.key ? cream : ink, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{stat.value}</p>
                  {stat.sub && <p style={{ fontSize: '10px', color: filter === stat.key ? 'rgba(255,255,255,0.4)' : '#B8A898', margin: 0 }}>{stat.sub}</p>}
                </div>
              ))}
            </div>

            <div style={{ background: cream, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '11px', color: mid, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {filter === 'all' ? 'Todas las propuestas' : `Propuestas ${statusLabel[filter]?.toLowerCase()}s`}
                </p>
                {filter !== 'all' && (
                  <button onClick={() => setFilter('all')}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: accent, cursor: 'pointer', textDecoration: 'underline' }}>
                    Ver todas
                  </button>
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
                    <button onClick={() => router.push('/editor')}
                      style={{ background: ink, color: cream, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      Crear primera propuesta
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((proposal, index) => (
                  isMobile ? (
                    <div key={proposal.id}
                      style={{ padding: '14px 16px', borderBottom: index < filtered.length - 1 ? `1px solid ${border}` : 'none', cursor: 'pointer' }}
                      onClick={() => router.push(proposal.status === 'signed' ? `/p/${proposal.id}` : `/editor/${proposal.id}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>{proposal.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[proposal.status] }} />
                          <span style={{ fontSize: '11px', color: mid }}>{statusLabel[proposal.status]}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', color: mid }}>{proposal.client_name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: ink }}>{Number(proposal.total_amount).toLocaleString('es-ES')}€</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <CopyLinkButton id={proposal.id} />
                        {proposal.status !== 'signed' && (
                          <button onClick={e => handleDelete(e, proposal.id)}
                            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#C4624A', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={proposal.id}
                      style={{ padding: '16px 24px', borderBottom: index < filtered.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'background 0.1s' }}
                      onClick={() => router.push(proposal.status === 'signed' ? `/p/${proposal.id}` : `/editor/${proposal.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '14px' }}>📄</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: ink, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proposal.title}</p>
                        <p style={{ fontSize: '12px', color: mid, margin: '0 0 4px' }}>{proposal.client_name}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: '#B8A898' }}>Creada {fmt(proposal.created_at)}</span>
                          {fmt(proposal.signed_at) && <span style={{ fontSize: '11px', color: '#6B8F5E' }}>Firmada {fmt(proposal.signed_at)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[proposal.status] }} />
                        <span style={{ fontSize: '12px', color: mid }}>{statusLabel[proposal.status]}</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: ink, minWidth: '70px', textAlign: 'right' }}>
                        {Number(proposal.total_amount).toLocaleString('es-ES')}€
                      </span>
                      <CopyLinkButton id={proposal.id} />
                      {proposal.status !== 'signed' && (
                        <button onClick={e => handleDelete(e, proposal.id)}
                          style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#C4624A', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  )
                ))
              )}
            </div>
          </>
        )}

        {tab === 'stats' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Tasa de apertura', value: `${apertura}%`, sub: `${opened + signed} de ${totalSent}` },
                { label: 'Tasa de firma', value: `${conversion}%`, sub: `${signed} de ${opened + signed}` },
                { label: 'Importe firmado', value: `${importeFirmado.toLocaleString('es-ES')}€`, sub: `${signed} propuesta${signed !== 1 ? 's' : ''}`, highlight: true },
              ].map(k => (
                <div key={k.label} style={{ background: cream, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px', gridColumn: k.highlight && isMobile ? '1 / -1' : 'auto' }}>
                  <p style={{ fontSize: '10px', color: mid, margin: '0 0 8px', letterSpacing: '1px', textTransform: 'uppercase' }}>{k.label}</p>
                  <p style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: '400', color: k.highlight ? '#6B8F5E' : ink, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{k.value}</p>
                  <p style={{ fontSize: '10px', color: '#B8A898', margin: 0 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {proposals.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={{ background: cream, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', color: mid, margin: '0 0 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Propuestas por mes</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={20}>
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#B8A898' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#B8A898' }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: `1px solid ${border}` }} cursor={{ fill: bg }} />
                      <Bar dataKey="propuestas" fill={accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: cream, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', color: mid, margin: '0 0 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Distribución por estado</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: `1px solid ${border}` }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ background: cream, border: `1px solid ${border}`, borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ color: mid, fontSize: '14px', margin: 0 }}>Crea tu primera propuesta para ver estadísticas</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}