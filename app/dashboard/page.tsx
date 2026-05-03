'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'

const bg = 'var(--bg-page)'
const card = 'var(--bg-card)'
const surface = 'var(--bg-surface)'
const primary = '#4F6EF7'
const primaryLight = '#EEF1FE'
const border = 'var(--border)'
const ink = 'var(--text-primary)'
const mid = 'var(--text-secondary)'

type Proposal = {
  id: string; title: string; client_name: string; client_email: string | null; status: string
  total_amount: number; created_at: string; sent_at: string | null; signed_at: string | null
  expires_at: string | null
}

type Subscription = {
  user_id: string; plan: 'free' | 'pro'; status: string; stripe_customer_id?: string
}

const countThisMonth = (proposals: Proposal[]) => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  return proposals.filter(p => new Date(p.created_at) >= monthStart).length
}

const isExpired = (p: Proposal) =>
  !!p.expires_at && p.status !== 'signed' && new Date() > new Date(p.expires_at)

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const statusCfg: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  draft:  { bg: '#F1EFE8', color: '#5F5E5A', dot: '#888780', label: 'Borrador' },
  sent:   { bg: '#E6F1FB', color: '#185FA5', dot: '#378ADD', label: 'Enviada' },
  opened: { bg: '#FAEEDA', color: '#854F0B', dot: '#BA7517', label: 'Abierta' },
  signed: { bg: '#EAF3DE', color: '#3B6D11', dot: '#639922', label: 'Firmada' },
}

type FilterKey = 'all' | 'draft' | 'sent' | 'opened' | 'signed'

function CopyLinkBtn({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        navigator.clipboard.writeText(`${window.location.origin}/p/${id}`).then(() => {
          setCopied(true); setTimeout(() => setCopied(false), 2000)
        })
      }}
      style={{ background: 'none', border: 'none', fontSize: '12px', color: mid, cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
      {copied ? '✓ Copiado' : 'Copiar link'}
    </button>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const isBelowDesktop = useIsMobile(1024)
  const isTablet = isBelowDesktop && !isMobile
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetId, setSheetId] = useState<string | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    if (!localStorage.getItem('theme')) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase.from('profiles').select('theme_preference').eq('user_id', user.id).single().then(({ data }) => {
          const pref = (data as { theme_preference?: string } | null)?.theme_preference
          if (pref) { localStorage.setItem('theme', pref); document.documentElement.classList.toggle('dark', pref === 'dark'); setDark(pref === 'dark') }
        })
      })
    }
  }, [])
  const toggleTheme = async () => { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); localStorage.setItem('theme', next ? 'dark' : 'light'); const { data: { user } } = await supabase.auth.getUser(); if (user) supabase.from('profiles').update({ theme_preference: next ? 'dark' : 'light' }).eq('user_id', user.id) }

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

  const counts = {
    total: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    opened: proposals.filter(p => p.status === 'opened').length,
    signed: proposals.filter(p => p.status === 'signed').length,
  }

  const filtered = (() => {
    let list = filter === 'all' ? proposals : proposals.filter(p => p.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (a.created_at < b.created_at) return sortDir === 'asc' ? -1 : 1
      if (a.created_at > b.created_at) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  })()

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
    if (!canCreate) { handleUpgrade(); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    const { data: src } = await supabase.from('proposals').select('blocks, title, client_name, client_email, total_amount').eq('id', id).single()
    if (!src) { setLoading(false); return }
    const newBlocks = (src.blocks || []).map((b: Record<string, unknown>) => ({ ...b, id: crypto.randomUUID() }))
    const { data: created } = await supabase.from('proposals').insert({
      user_id: user.id, title: `${src.title} (Copia)`, client_name: src.client_name,
      client_email: src.client_email, blocks: newBlocks, total_amount: src.total_amount, status: 'draft'
    }).select('id').single()
    if (created) router.push(`/editor/${created.id}`)
    else setLoading(false)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleUpgrade = async () => {
    setUpgradeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` } })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch { alert('Error al procesar el pago') }
    finally { setUpgradeLoading(false) }
  }

  const thisMonth = countThisMonth(proposals)
  const canCreate = subscription?.plan === 'pro' || thisMonth < 3

  const statCards = [
    { key: 'total' as FilterKey,  label: 'Total',       value: counts.total,  bar: null,      hint: null,        hero: true },
    { key: 'draft' as FilterKey,  label: 'Borradores',  value: counts.draft,  bar: '#888780', hint: 'Sin enviar', hero: false },
    { key: 'sent' as FilterKey,   label: 'No abiertas', value: counts.sent,   bar: '#BA7517', hint: null,        hero: false },
    { key: 'opened' as FilterKey, label: 'Abiertas',    value: counts.opened, bar: '#378ADD', hint: null,        hero: false },
    { key: 'signed' as FilterKey, label: 'Firmadas',    value: counts.signed, bar: '#639922', hint: null,        hero: false },
  ]

  const filterPills = [
    { key: 'all' as FilterKey,    label: 'Todas' },
    { key: 'draft' as FilterKey,  label: 'Borrador' },
    { key: 'sent' as FilterKey,   label: 'Enviadas' },
    { key: 'opened' as FilterKey, label: 'Abiertas' },
    { key: 'signed' as FilterKey, label: 'Firmadas' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: ink }}>

      {/* Nav */}
      <nav style={{ background: card, borderBottom: `0.5px solid ${border}`, height: '52px', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', marginRight: '28px' }}>
          propos<span style={{ color: primary }}>ly</span>
        </span>
        {isMobile ? (
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button aria-label="Menú" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
              style={{ width: '44px', height: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
            </button>
            {menuOpen && (
              <div onClick={e => e.stopPropagation()}
                style={{ position: 'fixed', top: '52px', left: 0, right: 0, background: card, borderBottom: `0.5px solid ${border}`, padding: '8px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 20 }}>
                <a href="/settings" onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid ${border}` }}>Ajustes</a>
                <button onClick={() => { setMenuOpen(false); handleSignOut() }}
                  style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: `0.5px solid ${border}` }}>Cerrar sesión</button>
                <button onClick={() => { setMenuOpen(false); toggleTheme() }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span>Modo {dark ? 'claro' : 'oscuro'}</span><span>{dark ? '☀' : '🌙'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={toggleTheme}
              style={{ fontSize: '14px', background: 'none', border: `0.5px solid ${border}`, padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', color: mid }}>
              {dark ? '☀' : '🌙'}
            </button>
            <a href="/settings" style={{ fontSize: '13px', color: mid, textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: `0.5px solid ${border}` }}>Ajustes</a>
            <button onClick={handleSignOut} style={{ fontSize: '13px', color: mid, background: 'none', border: `0.5px solid ${border}`, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px 80px' : isTablet ? '28px 24px' : '36px 28px' }}>

        {/* Page tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '24px' }}>
          <a href="/dashboard" style={{ fontSize: '13px', color: primary, background: primaryLight, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none', fontWeight: '500' }}>Propuestas</a>
          <a href="/stats" style={{ fontSize: '13px', color: mid, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none' }}>Estadísticas</a>
        </div>

        {/* Upgrade banner */}
        {subscription?.plan === 'free' && thisMonth >= 3 && (
          <div style={{ background: card, border: `0.5px solid ${border}`, borderLeft: '3px solid #BA7517', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#854F0B', margin: '0 0 2px' }}>Límite mensual alcanzado</p>
              <p style={{ fontSize: '12px', color: mid, margin: 0 }}>3 propuestas este mes. Actualiza a Pro para propuestas ilimitadas.</p>
            </div>
            <button onClick={handleUpgrade} disabled={upgradeLoading}
              style={{ background: primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: upgradeLoading ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: upgradeLoading ? 0.6 : 1 }}>
              {upgradeLoading ? 'Cargando...' : 'Upgrade a Pro'}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '500', margin: '0 0 2px', letterSpacing: '-0.3px' }}>Propuestas</h1>
            <p style={{ fontSize: '12px', color: mid, margin: 0 }}>{proposals.length} propuestas en total</p>
          </div>
          <button onClick={() => canCreate ? router.push('/editor') : handleUpgrade()} disabled={upgradeLoading}
            style={{ background: primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', opacity: upgradeLoading ? 0.6 : 1 }}>
            {upgradeLoading ? 'Cargando...' : '+ Nueva propuesta'}
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {statCards.map(s => (
            <div key={s.key} onClick={() => setFilter(s.key === filter ? 'all' : s.key)}
              style={{
                background: s.hero ? primary : card,
                border: `0.5px solid ${filter === s.key && !s.hero ? '#C4CEFC' : border}`,
                borderRadius: '12px',
                padding: '14px 14px 12px',
                cursor: 'pointer',
                outline: filter === s.key && !s.hero ? `2px solid ${primaryLight}` : 'none',
                gridColumn: isMobile && s.hero ? '1 / -1' : 'auto',
              }}>
              {!s.hero && s.bar && (
                <div style={{ width: '24px', height: '3px', background: s.bar, borderRadius: '2px', marginBottom: '8px' }} />
              )}
              <p style={{ fontSize: '11px', color: s.hero ? 'rgba(255,255,255,0.75)' : mid, margin: '0 0 4px', letterSpacing: '0.2px' }}>{s.label}</p>
              <p style={{ fontSize: '22px', fontWeight: '500', color: s.hero ? '#fff' : ink, margin: '0', lineHeight: 1 }}>{s.value}</p>
              {s.hint && <p style={{ fontSize: '11px', color: mid, margin: '4px 0 0' }}>{s.hint}</p>}
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>

          {/* Controls */}
          <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${border}`, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: isMobile ? 'nowrap' : 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px', width: isMobile ? '100%' : 'auto' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: mid, pointerEvents: 'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar propuesta o cliente..."
                style={{ width: '100%', background: surface, border: 'none', borderRadius: '8px', padding: isMobile ? '11px 10px 11px 28px' : '7px 10px 7px 28px', fontSize: '13px', color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', width: isMobile ? '100%' : 'auto', paddingBottom: isMobile ? '2px' : 0 }}>
              {filterPills.map(p => (
                <button key={p.key} onClick={() => setFilter(p.key)}
                  style={{
                    background: filter === p.key ? primaryLight : 'none',
                    border: filter === p.key ? '0.5px solid #C4CEFC' : `0.5px solid ${border}`,
                    color: filter === p.key ? primary : mid,
                    borderRadius: '20px', padding: isMobile ? '8px 14px' : '4px 11px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
                  }}>
                  {p.label}
                </button>
              ))}
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                style={{ background: 'none', border: `0.5px solid ${border}`, borderRadius: '20px', padding: isMobile ? '8px 14px' : '4px 11px', fontSize: '12px', color: mid, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: isMobile ? 'auto' : '4px' }}>
                {sortDir === 'desc' ? '↓' : '↑'} Fecha
              </button>
            </div>
          </div>

          {/* Column headers */}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 90px 190px', padding: '8px 14px', borderBottom: `0.5px solid ${border}`, background: surface }}>
              {['Propuesta', 'Fecha', 'Estado', 'Importe', 'Acciones'].map((h, i) => (
                <span key={h} style={{ fontSize: '11px', color: mid, fontWeight: '500', letterSpacing: '0.3px', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: mid, fontSize: '13px' }}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: '500', color: ink, margin: '0 0 6px' }}>Sin propuestas</p>
              <p style={{ fontSize: '12px', color: mid, margin: '0 0 16px' }}>
                {filter === 'all' ? 'Crea tu primera propuesta para empezar' : 'No hay propuestas con este filtro'}
              </p>
              {filter === 'all' && (
                <button onClick={() => canCreate ? router.push('/editor') : handleUpgrade()} disabled={upgradeLoading}
                  style={{ background: primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Crear propuesta
                </button>
              )}
            </div>
          ) : filtered.map((p, i) => {
            const cfg = statusCfg[p.status] || statusCfg.draft
            if (isMobile) return (
              <div key={p.id}
                onClick={() => setSheetId(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '60px', padding: '12px 14px', borderBottom: i < filtered.length - 1 ? `0.5px solid ${border}` : 'none', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: ink, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <p style={{ fontSize: '12px', color: mid, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client_name}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, borderRadius: '20px', padding: '3px 8px', fontSize: '11px', fontWeight: '500' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                    {cfg.label}
                  </span>
                  {isExpired(p) && (
                    <span style={{ fontSize: '10px', color: '#A32D2D', background: '#FEE', padding: '2px 6px', borderRadius: '10px' }}>Caducada</span>
                  )}
                </div>
                <span style={{ fontSize: '18px', color: mid, paddingLeft: '4px' }}>›</span>
              </div>
            )
            return (
              <div key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 110px 90px 90px 190px',
                  padding: '11px 14px',
                  borderBottom: i < filtered.length - 1 ? `0.5px solid ${border}` : 'none',
                  cursor: 'pointer',
                  alignItems: 'center',
                  transition: 'background 0.1s',
                }}
                onClick={() => router.push(p.status === 'signed' ? `/p/${p.id}` : `/editor/${p.id}`)}
                onMouseEnter={e => (e.currentTarget.style.background = surface)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: ink, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <p style={{ fontSize: '11px', color: mid, margin: 0 }}>{p.client_name}</p>
                </div>

                <span style={{ fontSize: '12px', color: mid }}>{fmtDate(p.created_at)}</span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, borderRadius: '20px', padding: '3px 8px', fontSize: '11px', fontWeight: '500' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                    {cfg.label}
                  </span>
                  {isExpired(p) && (
                    <span style={{ fontSize: '10px', color: '#A32D2D', background: '#FEE', padding: '2px 6px', borderRadius: '10px' }}>Caducada</span>
                  )}
                </div>

                <span style={{ fontSize: '13px', fontWeight: '500', color: ink, textAlign: 'right' }}>
                  {Number(p.total_amount).toLocaleString('es-ES')}€
                </span>

                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <CopyLinkBtn id={p.id} />
                  {p.status !== 'signed' && (
                    <button
                      onClick={e => p.status === 'draft' ? handleMarkAsSent(e, p.id) : (e.stopPropagation(), window.open(`/p/${p.id}`, '_blank'))}
                      style={{ background: primaryLight, border: 'none', color: primary, borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {p.status === 'draft' ? 'Enviar' : 'Ver'}
                    </button>
                  )}
                  <button onClick={e => handleDuplicate(e, p.id)} title="Duplicar"
                    style={{ background: 'none', border: `0.5px solid ${border}`, borderRadius: '6px', width: '28px', height: '28px', fontSize: '13px', color: mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    ⎘
                  </button>
                  {p.status !== 'signed' && (
                    <button onClick={e => handleDelete(e, p.id)} title="Eliminar"
                      style={{ background: 'none', border: '0.5px solid rgba(162,45,45,0.25)', borderRadius: '6px', width: '28px', height: '28px', fontSize: '14px', color: '#A32D2D', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile action sheet */}
      {sheetId && isMobile && (() => {
        const p = proposals.find(x => x.id === sheetId)
        if (!p) return null
        const close = () => setSheetId(null)
        const stop = (e: React.MouseEvent) => e.stopPropagation()
        const open = () => { close(); router.push(p.status === 'signed' ? `/p/${p.id}` : `/editor/${p.id}`) }
        const send = async (e: React.MouseEvent) => { close(); await handleMarkAsSent(e, p.id) }
        const copy = () => { navigator.clipboard.writeText(`${window.location.origin}/p/${p.id}`); close() }
        const del = async (e: React.MouseEvent) => { close(); await handleDelete(e, p.id) }
        const itemStyle = (danger = false, dim = false): React.CSSProperties => ({
          minHeight: '52px', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: '15px', color: danger ? '#A32D2D' : dim ? mid : ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderTop: `0.5px solid ${border}`, width: '100%'
        })
        return (
          <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={stop} style={{ background: card, width: '100%', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '8px 0 16px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ width: '36px', height: '4px', background: border, borderRadius: '2px', margin: '8px auto 12px' }} />
              <div style={{ padding: '0 18px 12px' }}>
                <p style={{ fontSize: '15px', fontWeight: '500', color: ink, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                <p style={{ fontSize: '12px', color: mid, margin: 0 }}>{p.client_name}</p>
              </div>
              <button onClick={open} style={itemStyle()}>{p.status === 'signed' ? 'Ver propuesta' : 'Editar propuesta'}</button>
              {p.status === 'draft' && (
                <button onClick={send} style={itemStyle()}>Enviar</button>
              )}
              <button onClick={copy} style={itemStyle()}>Copiar link</button>
              {p.status !== 'signed' && (
                <button onClick={del} style={itemStyle(true)}>Eliminar</button>
              )}
              <button onClick={close} style={{ ...itemStyle(false, true), marginTop: '8px' }}>Cancelar</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
