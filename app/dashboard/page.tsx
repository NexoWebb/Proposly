'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import UserLogo from '@/components/UserLogo'
import { loadStripe } from '@stripe/stripe-js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const pageBg = 'linear-gradient(160deg, #EDF5FC 0%, #F5F9FD 55%, #EAF3FA 100%)'
const topbar = '#0F2A3D'
const ink = '#0F2A3D'
const mid = '#6B8A9E'
const border = '#E2EBF2'
const cardBg = '#ffffff'
const accent = '#4A7FA5'
const accentLight = '#EAF4FB'

type Proposal = {
  id: string; title: string; client_name: string; client_email: string | null; status: string
  total_amount: number; created_at: string; sent_at: string | null; signed_at: string | null
  expires_at: string | null
}

type Subscription = {
  user_id: string; plan: 'free' | 'pro'; status: string; stripe_customer_id?: string
}

const countProposalsThisMonth = (proposals: Proposal[]) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return proposals.filter(p => new Date(p.created_at) >= monthStart).length
}

const isExpired = (p: Proposal) =>
  !!p.expires_at && p.status !== 'signed' && new Date() > new Date(p.expires_at)

const fmt = (d: string | null) => d ? new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

const statusLabel: Record<string, string> = { draft: 'Borrador', sent: 'Enviada', opened: 'Abierta', signed: 'Firmada' }
const statusColor: Record<string, string> = { draft: '#94A3B8', sent: '#4A7FA5', opened: '#D4854A', signed: '#4A9B6F' }
const statusBg: Record<string, string> = { draft: '#F8FAFC', sent: '#EAF4FB', opened: '#FEF3E8', signed: '#E8F5EE' }
const statusLabelPlural: Record<string, string> = { draft: 'Borradores', sent: 'No abiertas', opened: 'Abiertas', signed: 'Firmadas' }

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
      style={{ background: copied ? '#E8F5EE' : 'transparent', border: `1px solid ${copied ? '#4A9B6F' : border}`, borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: copied ? '#4A9B6F' : mid, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.15s', fontWeight: '500' }}>
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
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [tab, setTab] = useState<Tab>('proposals')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('proposals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!cancelled && !error && data) setProposals(data)
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
      if (!cancelled && sub) setSubscription(sub)
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
    { label: 'Borradores', key: 'draft' as FilterKey, value: proposals.filter(p => p.status === 'draft').length, color: '#94A3B8', sub: 'Sin enviar' },
    { label: 'No abiertas', key: 'sent' as FilterKey, value: sent, color: '#4A7FA5', sub: 'Sin abrir' },
    { label: 'Abiertas', key: 'opened' as FilterKey, value: opened, color: '#D4854A', sub: 'Sin firmar' },
    { label: 'Firmadas', key: 'signed' as FilterKey, value: signed, color: '#4A9B6F' },
  ]

  const filtered = (() => {
    let list = filter === 'all' ? proposals : proposals.filter(p => p.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const av = sortBy === 'date' ? a.created_at : sortBy === 'amount' ? Number(a.total_amount) : a.status
      const bv = sortBy === 'date' ? b.created_at : sortBy === 'amount' ? Number(b.total_amount) : b.status
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  })()

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
    { name: 'Borrador', value: proposals.filter(p => p.status === 'draft').length, color: '#94A3B8' },
    { name: 'Enviada', value: sent, color: '#4A7FA5' },
    { name: 'Abierta', value: opened, color: '#D4854A' },
    { name: 'Firmada', value: signed, color: '#4A9B6F' },
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

  const handleMarkAsSent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const proposal = proposals.find(p => p.id === id)
    if (!proposal?.client_email) {
      alert('Esta propuesta no tiene email de cliente. Ábrela en el editor para añadirlo.')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ id }) })
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'sent', sent_at: new Date().toISOString() } : p))
  }

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    const { data: fullProposal } = await supabase.from('proposals').select('blocks, title, client_name, client_email, total_amount').eq('id', id).single()
    if (!fullProposal) { setLoading(false); return }
    const newBlocks = (fullProposal.blocks || []).map((b: Record<string, unknown>) => ({ ...b, id: crypto.randomUUID() }))
    const { data: newProposal } = await supabase.from('proposals').insert({
      user_id: user.id, title: `${fullProposal.title} (Copia)`, client_name: fullProposal.client_name,
      client_email: fullProposal.client_email, blocks: newBlocks, total_amount: fullProposal.total_amount, status: 'draft'
    }).select('id').single()
    if (newProposal) router.push(`/editor/${newProposal.id}`)
    else setLoading(false)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleUpgradeClick = async () => {
    setUpgradeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` } })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Error al procesarse a Stripe')
    } finally {
      setUpgradeLoading(false)
    }
  }

  const thisMonthCount = countProposalsThisMonth(proposals)
  const canCreateProposal = !subscription || subscription.plan === 'pro' || thisMonthCount < 3

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', color: ink }}>

      <div style={{ background: topbar, padding: `0 ${isMobile ? '16px' : '32px'}`, display: 'flex', alignItems: 'center', height: '64px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 24px rgba(10,26,41,0.3)' }}>
        <UserLogo />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/settings" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', textDecoration: 'none', padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
            Ajustes
          </a>
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            {isMobile ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '28px 16px' : '52px 24px' }}>

        {subscription?.plan === 'free' && thisMonthCount >= 3 && (
          <div style={{ background: '#fff', border: '1px solid #F0D9B5', borderLeft: '4px solid #D4854A', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 2px 8px rgba(212,133,74,0.1)' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#92400E', margin: '0 0 3px' }}>Límite mensual alcanzado</p>
              <p style={{ fontSize: '12px', color: '#B45309', margin: 0 }}>Has creado 3 propuestas este mes. Actualiza a Pro para propuestas ilimitadas.</p>
            </div>
            <button onClick={handleUpgradeClick} disabled={upgradeLoading} style={{ background: '#D4854A', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: upgradeLoading ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: upgradeLoading ? 0.6 : 1, boxShadow: '0 4px 12px rgba(212,133,74,0.3)' }}>
              {upgradeLoading ? 'Cargando...' : 'Upgrade a Pro'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '36px' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: '400', color: ink, margin: '0 0 6px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Tus propuestas</h1>
            <p style={{ fontSize: '14px', color: mid, margin: 0 }}>Gestiona y haz seguimiento de todas tus propuestas</p>
          </div>
          <button onClick={() => router.push('/editor')} disabled={!canCreateProposal} title={!canCreateProposal ? 'Has alcanzado tu límite de 3 propuestas/mes' : ''}
            style={{ background: canCreateProposal ? accent : '#CBD5E1', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: canCreateProposal ? 'pointer' : 'not-allowed', flexShrink: 0, width: isMobile ? '100%' : 'auto', boxShadow: canCreateProposal ? '0 4px 16px rgba(74,127,165,0.35)' : 'none', letterSpacing: '0.2px' }}>
            + Nueva propuesta
          </button>
        </div>

        <div style={{ display: 'flex', gap: '2px', marginBottom: '28px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '4px', width: 'fit-content', border: `1px solid ${border}` }}>
          {(['proposals', 'stats'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? accent : 'transparent', border: 'none', padding: '8px 22px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', color: tab === t ? '#fff' : mid, cursor: 'pointer', transition: 'all 0.15s', boxShadow: tab === t ? '0 2px 8px rgba(74,127,165,0.25)' : 'none' }}>
              {t === 'proposals' ? 'Propuestas' : 'Estadísticas'}
            </button>
          ))}
        </div>

        {tab === 'proposals' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 5}, 1fr)`, gap: '10px', marginBottom: '24px' }}>
              {stats.map(stat => (
                <div key={stat.key} onClick={() => setFilter(stat.key)}
                  style={{
                    background: filter === stat.key ? accent : cardBg,
                    border: `1px solid ${filter === stat.key ? accent : border}`,
                    borderLeft: `3px solid ${filter === stat.key ? 'rgba(255,255,255,0.4)' : stat.color}`,
                    borderRadius: '14px', padding: '18px 16px', cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: filter === stat.key ? '0 8px 24px rgba(74,127,165,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                  <p style={{ fontSize: '10px', color: filter === stat.key ? 'rgba(255,255,255,0.6)' : mid, margin: '0 0 10px', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '600' }}>{stat.label}</p>
                  <p style={{ fontSize: isMobile ? '28px' : '34px', fontWeight: '300', color: filter === stat.key ? '#fff' : ink, margin: '0 0 4px', fontFamily: 'Georgia, serif', lineHeight: 1 }}>{stat.value}</p>
                  {stat.sub && <p style={{ fontSize: '10px', color: filter === stat.key ? 'rgba(255,255,255,0.45)' : '#94A3B8', margin: 0 }}>{stat.sub}</p>}
                </div>
              ))}
            </div>

            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center', background: '#FAFBFC' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', pointerEvents: 'none', color: '#94A3B8' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título o cliente..."
                    style={{ width: '100%', background: '#fff', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 10px 8px 30px', fontSize: '13px', color: ink, outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>Ordenar:</span>
                  {(['date', 'amount', 'status'] as const).map(s => (
                    <button key={s} onClick={() => { if (sortBy === s) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(s); setSortDir('desc') } }}
                      style={{ background: sortBy === s ? accentLight : 'transparent', border: `1px solid ${sortBy === s ? accent : border}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', color: sortBy === s ? accent : mid, cursor: 'pointer', transition: 'all 0.15s', fontWeight: sortBy === s ? '600' : '400' }}>
                      {s === 'date' ? 'Fecha' : s === 'amount' ? 'Importe' : 'Estado'}{sortBy === s ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </button>
                  ))}
                  {filter !== 'all' && <button onClick={() => setFilter('all')} style={{ background: 'none', border: 'none', fontSize: '11px', color: accent, cursor: 'pointer', textDecoration: 'underline' }}>Ver todas</button>}
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '56px', textAlign: 'center', color: mid, fontSize: '14px' }}>Cargando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>📋</div>
                  <p style={{ color: ink, fontSize: '15px', fontWeight: '500', marginBottom: '6px' }}>{filter === 'all' ? 'Sin propuestas todavía' : `No hay ${statusLabelPlural[filter]?.toLowerCase()}`}</p>
                  <p style={{ color: mid, fontSize: '13px', marginBottom: '20px' }}>{filter === 'all' ? 'Crea tu primera propuesta para empezar' : ''}</p>
                  {filter === 'all' && <button onClick={() => router.push('/editor')} style={{ background: accent, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px rgba(74,127,165,0.3)' }}>Crear primera propuesta</button>}
                </div>
              ) : (
                filtered.map((proposal, index) => (
                  <div key={proposal.id}
                    style={{
                      padding: isMobile ? '14px 16px' : '16px 20px',
                      borderBottom: index < filtered.length - 1 ? `1px solid ${border}` : 'none',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      transition: 'background 0.1s',
                      boxShadow: `inset 3px 0 0 ${isExpired(proposal) ? '#EF4444' : statusColor[proposal.status]}`,
                    }}
                    onClick={() => router.push(proposal.status === 'signed' ? `/p/${proposal.id}` : `/editor/${proposal.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FBFE')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: statusBg[proposal.status], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${border}` }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[proposal.status] }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: ink, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proposal.title}</p>
                      <p style={{ fontSize: '12px', color: mid, margin: 0 }}>{proposal.client_name}</p>
                    </div>

                    {!isMobile && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Creada {fmt(proposal.created_at)}</span>
                        {proposal.status !== 'draft' && proposal.sent_at && <span style={{ fontSize: '11px', color: '#4A7FA5' }}>Enviada {fmt(proposal.sent_at)}</span>}
                        {proposal.signed_at && <span style={{ fontSize: '11px', color: '#4A9B6F' }}>Firmada {fmt(proposal.signed_at)}</span>}
                      </div>
                    )}

                    {isExpired(proposal) && (
                      <span style={{ fontSize: '11px', color: '#DC2626', background: '#FEF2F2', padding: '4px 10px', borderRadius: '6px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0, border: '1px solid #FECACA' }}>
                        Caducada
                      </span>
                    )}

                    <span style={{ fontSize: '11px', color: statusColor[proposal.status], background: statusBg[proposal.status], padding: '4px 10px', borderRadius: '6px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0, border: `1px solid ${statusColor[proposal.status]}30` }}>
                      {statusLabel[proposal.status]}
                    </span>

                    <span style={{ fontSize: '15px', fontWeight: '700', color: ink, minWidth: '72px', textAlign: 'right', flexShrink: 0, fontFamily: 'Georgia, serif' }}>
                      {Number(proposal.total_amount).toLocaleString('es-ES')}€
                    </span>

                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                      <CopyLinkButton id={proposal.id} />
                      {proposal.status === 'draft' && (
                        <button onClick={e => handleMarkAsSent(e, proposal.id)}
                          style={{ background: '#E8F5EE', border: '1px solid #4A9B6F', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: '#4A9B6F', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', fontWeight: '600' }}>
                          Enviar
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); window.open(`/p/${proposal.id}?export=true`, '_blank') }} title="Descargar PDF"
                        style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: mid, cursor: 'pointer', flexShrink: 0 }}>
                        ⬇
                      </button>
                      <button onClick={e => handleDuplicate(e, proposal.id)} title="Duplicar propuesta"
                        style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: mid, cursor: 'pointer', flexShrink: 0 }}>
                        📄
                      </button>
                      {proposal.status !== 'signed' && (
                        <button onClick={e => handleDelete(e, proposal.id)} title="Eliminar propuesta"
                          style={{ background: 'transparent', border: '1px solid #FECACA', borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#EF4444', cursor: 'pointer', flexShrink: 0 }}>
                          🗑️
                        </button>
                      )}
                    </div>
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
                { label: 'Importe firmado', value: `${importeFirmado.toLocaleString('es-ES')}€`, sub: `${signed} propuesta${signed !== 1 ? 's' : ''}`, color: '#4A9B6F', span: isMobile },
              ].map(k => (
                <div key={k.label} style={{ background: cardBg, border: `1px solid ${border}`, borderTop: `3px solid ${k.color}`, borderRadius: '14px', padding: '22px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gridColumn: k.span ? '1 / -1' : 'auto' }}>
                  <p style={{ fontSize: '10px', color: mid, margin: '0 0 12px', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '600' }}>{k.label}</p>
                  <p style={{ fontSize: isMobile ? '30px' : '38px', fontWeight: '300', color: k.color, margin: '0 0 4px', fontFamily: 'Georgia, serif', lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {proposals.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '22px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '11px', color: mid, margin: '0 0 20px', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '600' }}>Propuestas por mes</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={16}>
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '10px', border: `1px solid ${border}`, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: accentLight }} />
                      <Bar dataKey="propuestas" fill={accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '22px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '11px', color: mid, margin: '0 0 20px', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '600' }}>Distribución por estado</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '10px', border: `1px solid ${border}`, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '56px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p style={{ color: mid, fontSize: '14px', margin: 0 }}>Crea tu primera propuesta para ver estadísticas</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
