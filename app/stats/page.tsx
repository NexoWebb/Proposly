'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const bg = 'var(--bg-page)'
const card = 'var(--bg-card)'
const surface = 'var(--bg-surface)'
const primary = '#4F6EF7'
const primaryLight = '#EEF1FE'
const border = 'var(--border)'
const ink = 'var(--text-primary)'
const mid = 'var(--text-secondary)'

type Proposal = {
  id: string; title: string; client_name: string; status: string
  total_amount: number; created_at: string; sent_at: string | null
  signed_at: string | null; opened_at: string | null
}

type Range = '7d' | '30d' | '90d' | '12m'

const rangeDays: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 }

const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k €` : `${v} €`

function KpiCard({ label, value, delta, hint }: { label: string; value: string; delta?: { text: string; positive: boolean } | null; hint?: string }) {
  return (
    <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', padding: '16px 18px' }}>
      <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: '500', color: ink, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      {hint && <p style={{ fontSize: '12px', color: mid, margin: delta ? '0 0 3px' : '0' }}>{hint}</p>}
      {delta && (
        <p style={{ fontSize: '12px', color: delta.positive ? '#3B6D11' : '#A32D2D', margin: 0 }}>
          {delta.text}
        </p>
      )}
    </div>
  )
}

export default function StatsPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('30d')
  const [dark, setDark] = useState(false)

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('proposals').select('id,title,client_name,status,total_amount,created_at,sent_at,signed_at,opened_at').eq('user_id', user.id)
      if (!cancelled && !error && data) setProposals(data)
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); localStorage.setItem('theme', next ? 'dark' : 'light') }

  const cutoff = new Date(Date.now() - rangeDays[range] * 24 * 60 * 60 * 1000)
  const inRange = proposals.filter(p => new Date(p.created_at) >= cutoff)

  const signed = inRange.filter(p => p.status === 'signed')
  const everSent = inRange.filter(p => p.sent_at)
  const everOpened = inRange.filter(p => p.opened_at || p.status === 'opened' || p.status === 'signed')

  const ingresos = signed.reduce((s, p) => s + Number(p.total_amount), 0)
  const tasaCierre = everSent.length > 0 ? Math.round(signed.length / everSent.length * 100) : 0
  const valorMedio = inRange.length > 0 ? Math.round(inRange.reduce((s, p) => s + Number(p.total_amount), 0) / inRange.length) : 0

  const avgDays = (() => {
    const withDates = signed.filter(p => p.signed_at)
    if (!withDates.length) return null
    const avg = withDates.reduce((s, p) => {
      const start = p.sent_at ? new Date(p.sent_at).getTime() : new Date(p.created_at).getTime()
      return s + (new Date(p.signed_at!).getTime() - start)
    }, 0) / withDates.length
    return Math.round(avg / (1000 * 60 * 60 * 24))
  })()

  // Previous period for delta computation
  const prevCutoff = new Date(cutoff.getTime() - rangeDays[range] * 24 * 60 * 60 * 1000)
  const prevInRange = proposals.filter(p => { const d = new Date(p.created_at); return d >= prevCutoff && d < cutoff })
  const prevSigned = prevInRange.filter(p => p.status === 'signed')
  const prevEverSent = prevInRange.filter(p => p.sent_at)
  const prevIngresos = prevSigned.reduce((s, p) => s + Number(p.total_amount), 0)
  const prevTasaCierre = prevEverSent.length > 0 ? Math.round(prevSigned.length / prevEverSent.length * 100) : null
  const prevValorMedio = prevInRange.length > 0 ? Math.round(prevInRange.reduce((s, p) => s + Number(p.total_amount), 0) / prevInRange.length) : null

  const mkPctDelta = (cur: number, prev: number | null): { text: string; positive: boolean } | null => {
    if (!prev) return null
    const pct = Math.round((cur - prev) / prev * 100)
    return { text: `${pct >= 0 ? '+' : ''}${pct}% vs periodo anterior`, positive: pct >= 0 }
  }
  const ingresosDelta = mkPctDelta(ingresos, prevIngresos || null)
  const tasaCierreDelta = prevTasaCierre !== null
    ? (() => { const pp = tasaCierre - prevTasaCierre; return { text: `${pp >= 0 ? '+' : ''}${pp} pp vs periodo anterior`, positive: pp >= 0 } })()
    : null
  const valorMedioDelta = mkPctDelta(valorMedio, prevValorMedio)

  const barData = (() => {
    const months: { mes: string; firmadas: number; enviadas: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-ES', { month: 'short' })
      months.push({
        mes: label,
        firmadas: proposals.filter(p => p.status === 'signed' && p.signed_at?.startsWith(key))
          .reduce((s, p) => s + Number(p.total_amount), 0),
        enviadas: proposals.filter(p => p.sent_at?.startsWith(key))
          .reduce((s, p) => s + Number(p.total_amount), 0),
      })
    }
    return months
  })()

  const total = inRange.length || 1
  const funnelData = [
    { label: 'Creadas',  pct: 100, color: '#4F6EF7' },
    { label: 'Enviadas', pct: Math.round(everSent.length / total * 100), color: '#7F77DD' },
    { label: 'Abiertas', pct: Math.round(everOpened.length / total * 100), color: '#85B7EB' },
    { label: 'Firmadas', pct: Math.round(signed.length / total * 100), color: '#C0DD97' },
  ]

  const topClients = (() => {
    const map = new Map<string, { count: number; amount: number }>()
    proposals.forEach(p => {
      const e = map.get(p.client_name) || { count: 0, amount: 0 }
      map.set(p.client_name, { count: e.count + 1, amount: e.amount + Number(p.total_amount) })
    })
    return [...map.entries()]
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  })()

  const maxClientAmt = topClients[0]?.amount || 1

  const clientMetrics = [
    { label: 'Tasa de apertura', value: `${everSent.length > 0 ? Math.round(everOpened.length / everSent.length * 100) : 0}%`, pct: everSent.length > 0 ? Math.round(everOpened.length / everSent.length * 100) : 0, accent: false },
    { label: 'Tasa de firma',    value: `${tasaCierre}%`, pct: tasaCierre, accent: false },
    { label: 'Valor medio',      value: fmtK(valorMedio), pct: Math.min(100, Math.round(valorMedio / 10000 * 100)), accent: false },
    { label: 'Tiempo a firma',   value: avgDays != null ? `${avgDays}d` : '—', pct: avgDays != null ? Math.min(100, Math.round(100 - avgDays)) : 0, accent: false },
    { label: 'Propuestas expiradas', value: `${proposals.filter(p => p.status !== 'signed' && p.status !== 'draft').length}`, pct: Math.round(proposals.filter(p => p.status !== 'signed' && p.status !== 'draft').length / (proposals.length || 1) * 100), accent: true },
  ]

  const ranges: Range[] = ['7d', '30d', '90d', '12m']

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: ink }}>

      {/* Nav */}
      <nav style={{ background: card, borderBottom: `0.5px solid ${border}`, height: '52px', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', marginRight: '28px' }}>
          propos<span style={{ color: primary }}>ly</span>
        </span>
        {!isMobile && (
          <div style={{ display: 'flex', gap: '2px' }}>
            <a href="/dashboard" style={{ fontSize: '13px', color: mid, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none' }}>Propuestas</a>
            <a href="/stats" style={{ fontSize: '13px', color: primary, background: primaryLight, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none', fontWeight: '500' }}>Estadísticas</a>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ fontSize: '14px', background: 'none', border: `0.5px solid ${border}`, padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', color: mid }}>
            {dark ? '☀' : '🌙'}
          </button>
          <a href="/settings" style={{ fontSize: '13px', color: mid, textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: `0.5px solid ${border}` }}>Ajustes</a>
          <button onClick={handleSignOut} style={{ fontSize: '13px', color: mid, background: 'none', border: `0.5px solid ${border}`, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '24px 14px' : '36px 24px' }}>

        {/* Page header + range pills */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '500', margin: '0 0 2px', letterSpacing: '-0.3px' }}>Estadísticas</h1>
            <p style={{ fontSize: '12px', color: mid, margin: 0 }}>Rendimiento de tus propuestas</p>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {ranges.map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{
                  background: range === r ? primaryLight : 'none',
                  border: range === r ? '0.5px solid #C4CEFC' : `0.5px solid ${border}`,
                  color: range === r ? primary : mid,
                  borderRadius: '20px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: mid, fontSize: '13px' }}>Cargando...</div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <KpiCard label="Ingresos cerrados" value={fmtK(ingresos)} hint={`${signed.length} propuesta${signed.length !== 1 ? 's' : ''} firmada${signed.length !== 1 ? 's' : ''}`} delta={ingresosDelta} />
              <KpiCard label="Tasa de cierre" value={`${tasaCierre}%`} hint={`${signed.length} de ${everSent.length} enviadas`} delta={tasaCierreDelta} />
              <KpiCard label="Valor medio propuesta" value={fmtK(valorMedio)} hint={`${inRange.length} propuestas`} delta={valorMedioDelta} />
              <KpiCard label="Tiempo medio a firma" value={avgDays != null ? `${avgDays} días` : '—'} hint={avgDays != null ? 'desde el envío' : 'Sin datos'} />
            </div>

            {/* Row 1: chart + funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '10px', marginBottom: '10px' }}>

              {/* Bar chart */}
              <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: ink, margin: 0 }}>Ingresos por mes</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: mid }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: primary, display: 'inline-block' }} />
                      Firmadas
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: mid }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#C4CEFC', display: 'inline-block' }} />
                      Enviadas
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} barSize={14} barGap={4}>
                    <CartesianGrid vertical={false} stroke={border} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: mid }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: mid }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      formatter={(v) => typeof v === 'number' ? fmtK(v) : String(v)}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: `0.5px solid ${border}`, background: card }}
                      cursor={{ fill: surface }}
                    />
                    <Bar dataKey="firmadas" fill={primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="enviadas" fill="#C4CEFC" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Funnel */}
              <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', padding: '18px 20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: ink, margin: '0 0 16px' }}>Embudo de propuestas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {funnelData.map(f => (
                    <div key={f.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: mid }}>{f.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: ink }}>{f.pct}%</span>
                      </div>
                      <div style={{ height: '28px', background: surface, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${f.pct}%`, background: f.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: top clients + client behavior */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>

              {/* Top clients */}
              <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', padding: '18px 20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: ink, margin: '0 0 14px' }}>Top clientes</p>
                {topClients.length === 0 ? (
                  <p style={{ fontSize: '12px', color: mid, margin: 0 }}>Sin datos todavía</p>
                ) : topClients.map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < topClients.length - 1 ? `0.5px solid ${border}` : 'none' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: primary }}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: ink, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: '11px', color: mid, margin: 0 }}>{c.count} propuesta{c.count !== 1 ? 's' : ''}</p>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: ink, flexShrink: 0 }}>{fmtK(c.amount)}</span>
                  </div>
                ))}
                {topClients.length === 0 && (
                  <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', color: mid }}>Crea propuestas para ver tus mejores clientes</p>
                  </div>
                )}
              </div>

              {/* Client behavior */}
              <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', padding: '18px 20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: ink, margin: '0 0 14px' }}>Comportamiento del cliente</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {clientMetrics.map(m => (
                    <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: mid }}>{m.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: ink }}>{m.value}</span>
                      </div>
                      <div style={{ height: '4px', background: surface, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, m.pct))}%`, background: m.accent ? '#E24B4A' : primary, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Client breakdown by amount */}
                {topClients.length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `0.5px solid ${border}` }}>
                    <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Distribución de clientes</p>
                    {topClients.slice(0, 3).map(c => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: mid, width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.name}</span>
                        <div style={{ flex: 1, height: '4px', background: surface, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(c.amount / maxClientAmt * 100)}%`, background: primary, borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: ink, width: '60px', textAlign: 'right', flexShrink: 0 }}>{fmtK(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
