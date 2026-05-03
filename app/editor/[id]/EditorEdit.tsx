'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, computeTotalWithOptionals, normalizeBlocks, mkBlock } from '@/components/BlockEditor'

const bg = 'var(--bg-page)'
const card = 'var(--bg-card)'
const surface = 'var(--bg-surface)'
const primary = '#4F6EF7'
const primaryLight = '#EEF1FE'
const border = 'var(--border)'
const ink = 'var(--text-primary)'
const mid = 'var(--text-secondary)'

const inp: React.CSSProperties = {
  width: '100%', background: surface, border: `0.5px solid ${border}`,
  borderRadius: '8px', padding: '8px 12px', fontSize: '13px',
  color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const blockPalette: { type: Block['type']; label: string; dot: string }[] = [
  { type: 'header',    label: 'Cabecera',   dot: '#4F6EF7' },
  { type: 'text',      label: 'Texto',      dot: '#639922' },
  { type: 'image',     label: 'Imagen',     dot: '#BA7517' },
  { type: 'services',  label: 'Servicios',  dot: '#378ADD' },
  { type: 'separator', label: 'Separador',  dot: '#888780' },
  { type: 'timeline',  label: 'Timeline',   dot: '#9B6DD8' },
]

export default function EditorEdit({ id }: { id: string }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const isBelowDesktop = useIsMobile(1024)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  const [userId,       setUserId]       = useState<string | null>(null)
  const [title,        setTitle]        = useState('')
  const [clientName,   setClientName]   = useState('')
  const [clientEmail,  setClientEmail]  = useState('')
  const [validUntil,   setValidUntil]   = useState('')
  const [blocks,       setBlocks]       = useState<Block[]>([])
  const [saving,       setSaving]       = useState(false)
  const [sending,      setSending]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [status,       setStatus]       = useState<string>('draft')
  const [showSendModal, setShowSendModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [copied,       setCopied]       = useState(false)
  const [dark,         setDark]         = useState(false)

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  const toggleTheme = () => { const n = !dark; setDark(n); document.documentElement.classList.toggle('dark', n); localStorage.setItem('theme', n ? 'dark' : 'light') }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const { data, error } = await supabase.from('proposals').select('*').eq('id', id).single()
      if (error || !data) { router.replace('/dashboard'); return }
      if (data.status === 'signed') { router.replace(`/p/${id}`); return }

      setTitle(data.title ?? '')
      setClientName(data.client_name ?? '')
      setClientEmail(data.client_email ?? '')
      setValidUntil(data.valid_until ? data.valid_until.split('T')[0] : '')
      setBlocks(normalizeBlocks(data.blocks ?? []))
      setStatus(data.status ?? 'draft')
      setLoading(false)
    }
    load()
  }, [id, router])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('proposals').update({
      title, client_name: clientName, client_email: clientEmail,
      blocks, total_amount: computeTotal(blocks),
      valid_until: validUntil || null,
    }).eq('id', id)
    router.push('/dashboard')
  }

  const handleSend = async () => {
    if (!clientEmail) return
    setSending(true)
    setShowSendModal(false)
    await supabase.from('proposals').update({
      title, client_name: clientName, client_email: clientEmail,
      blocks, total_amount: computeTotal(blocks),
      valid_until: validUntil || null,
    }).eq('id', id)
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, message: customMessage.trim() || undefined }) })
    const json = await res.json()
    if (!res.ok) {
      setSending(false)
      alert('Error al enviar: ' + (json.error ?? 'Error desconocido'))
      return
    }
    router.push('/dashboard')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${id}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const canSave = !!title && !saving && !sending
  const canSend = !!title && !!clientEmail && !saving && !sending && status === 'draft'

  const total = computeTotal(blocks)
  const totalWithOpts = computeTotalWithOptionals(blocks)
  const hasOptionals = totalWithOpts > total
  const subtotal = Math.round(total / 1.21 * 100) / 100
  const iva = Math.round((total - subtotal) * 100) / 100

  const fmtEur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '13px', fontFamily: 'system-ui, sans-serif' }}>
        Cargando propuesta...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: ink, display: 'flex', flexDirection: 'column' }}>

      {/* Send modal */}
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: card, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px', border: `0.5px solid ${border}` }}>
            <p style={{ fontSize: '15px', fontWeight: '500', color: ink, margin: '0 0 4px' }}>Enviar propuesta</p>
            <p style={{ fontSize: '13px', color: mid, margin: '0 0 16px' }}>Se enviará un email a <strong>{clientEmail}</strong></p>
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 6px' }}>Mensaje personalizado (opcional)</p>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
              placeholder="Hola, te adjunto la propuesta que comentamos..."
              rows={4}
              style={{ ...inp, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={() => { setShowSendModal(false); setCustomMessage('') }}
                style={{ flex: 1, background: 'none', border: `0.5px solid ${border}`, borderRadius: '8px', padding: '9px', fontSize: '13px', color: mid, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending}
                style={{ flex: 1, background: primary, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '500', cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Enviando...' : 'Enviar propuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: card, borderBottom: `0.5px solid ${border}`, padding: isMobile ? '0 12px' : '0 20px', height: '52px', display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ fontSize: '15px', fontWeight: '600', color: ink, textDecoration: 'none', letterSpacing: '-0.3px', flexShrink: 0 }}>
          propos<span style={{ color: primary }}>ly</span>
        </a>
        {!isMobile && (
          <>
            <span style={{ color: border, fontSize: '14px', flexShrink: 0 }}>/</span>
            <span style={{ fontSize: '12px', color: mid, flexShrink: 0 }}>
              <a href="/dashboard" style={{ color: mid, textDecoration: 'none' }}>Propuestas</a>
            </span>
            <span style={{ color: border, fontSize: '14px', flexShrink: 0 }}>/</span>
          </>
        )}

        {/* Editable title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '13px', fontWeight: '500', color: ink, fontFamily: 'inherit', minWidth: 0 }}
        />

        {/* Status pill */}
        <span style={{ background: surface, color: mid, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '500', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {status === 'draft' ? 'Borrador' : status === 'sent' ? 'Enviada' : status === 'opened' ? 'Abierta' : 'Firmada'}
        </span>

        {isMobile ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button aria-label="Menú" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
              style={{ width: '44px', height: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
            </button>
            {menuOpen && (
              <div onClick={e => e.stopPropagation()}
                style={{ position: 'fixed', top: '52px', left: 0, right: 0, background: card, borderBottom: `0.5px solid ${border}`, padding: '8px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 20 }}>
                <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid ${border}` }}>← Propuestas</a>
                <button onClick={() => { setMenuOpen(false); window.open(`/p/${id}`, '_blank') }}
                  style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: `0.5px solid ${border}` }}>Vista previa</button>
                <button onClick={() => { setMenuOpen(false); handleCopyLink() }}
                  style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: `0.5px solid ${border}` }}>{copied ? '✓ Copiado' : 'Copiar link'}</button>
                <a href="/settings" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid ${border}` }}>Ajustes</a>
                <button onClick={() => { setMenuOpen(false); toggleTheme() }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span>Modo {dark ? 'claro' : 'oscuro'}</span><span>{dark ? '☀' : '🌙'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button onClick={toggleTheme}
              style={{ fontSize: '14px', background: 'none', border: `0.5px solid ${border}`, padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', color: mid, flexShrink: 0 }}>
              {dark ? '☀' : '🌙'}
            </button>
            {!isBelowDesktop && (
              <>
                <button onClick={() => window.open(`/p/${id}`, '_blank')}
                  style={{ background: 'none', border: `0.5px solid ${border}`, color: mid, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Vista previa
                </button>
                <button onClick={handleCopyLink}
                  style={{ background: 'none', border: `0.5px solid ${border}`, color: copied ? '#639922' : mid, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {copied ? '✓ Copiado' : 'Copiar link'}
                </button>
              </>
            )}
            {!isBelowDesktop && (
              <button onClick={() => canSend ? setShowSendModal(true) : handleSave()} disabled={!canSave}
                style={{ background: primary, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '500', cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: canSave ? 1 : 0.5 }}>
                {saving ? 'Guardando...' : sending ? 'Enviando...' : status === 'draft' ? 'Enviar propuesta' : 'Guardar cambios'}
              </button>
            )}
          </>
        )}
      </div>

      {/* 2-col layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '20px 16px 88px' : isBelowDesktop ? '24px 24px 88px' : '28px 32px' }}>
          <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
        </div>

        {/* Right sidebar — desktop inline, below-desktop in slide-up panel */}
        {(!isBelowDesktop || detailsOpen) && (
          <div style={{
            width: isBelowDesktop ? '100%' : '240px',
            flexShrink: 0,
            background: card,
            borderLeft: isBelowDesktop ? 'none' : `0.5px solid ${border}`,
            borderTop: isBelowDesktop ? `0.5px solid ${border}` : 'none',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
            position: isBelowDesktop ? 'fixed' : 'static',
            left: isBelowDesktop ? 0 : 'auto',
            right: isBelowDesktop ? 0 : 'auto',
            bottom: isBelowDesktop ? 0 : 'auto',
            maxHeight: isBelowDesktop ? '85vh' : 'none',
            borderTopLeftRadius: isBelowDesktop ? '16px' : 0,
            borderTopRightRadius: isBelowDesktop ? '16px' : 0,
            boxShadow: isBelowDesktop ? '0 -8px 24px rgba(0,0,0,0.12)' : 'none',
            zIndex: isBelowDesktop ? 60 : 'auto',
          }}>
            {isBelowDesktop && (
              <div style={{ position: 'relative', padding: '8px 0' }}>
                <div style={{ width: '36px', height: '4px', background: border, borderRadius: '2px', margin: '0 auto' }} />
                <button onClick={() => setDetailsOpen(false)} aria-label="Cerrar"
                  style={{ position: 'absolute', right: '8px', top: '4px', width: '32px', height: '32px', background: 'none', border: 'none', cursor: 'pointer', color: mid, fontSize: '20px' }}>×</button>
              </div>
            )}

            {/* Client data */}
            <div style={{ padding: '18px 16px', borderBottom: `0.5px solid ${border}` }}>
              <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Datos del cliente</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input style={inp} placeholder="Empresa" value={clientName} onChange={e => setClientName(e.target.value)} />
                <input style={inp} type="email" placeholder="Email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
              </div>
            </div>

            {/* Validity */}
            <div style={{ padding: '18px 16px', borderBottom: `0.5px solid ${border}` }}>
              <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Validez</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: mid, margin: '0 0 4px' }}>Desde</p>
                  <div style={{ ...inp, color: mid, fontSize: '12px' }}>Hoy</div>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: mid, margin: '0 0 4px' }}>Hasta</p>
                  <input type="date" style={{ ...inp, fontSize: '12px' }} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Economic summary */}
            <div style={{ padding: '18px 16px', borderBottom: `0.5px solid ${border}` }}>
              <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Resumen económico</p>
              <div style={{ background: surface, borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: mid }}>Subtotal</span>
                  <span style={{ fontSize: '12px', color: ink }}>{fmtEur(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: mid }}>IVA 21%</span>
                  <span style={{ fontSize: '12px', color: ink }}>{fmtEur(iva)}</span>
                </div>
                <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: hasOptionals ? '8px' : 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: ink }}>Total base</span>
                  <span style={{ fontSize: '15px', fontWeight: '500', color: ink }}>{fmtEur(total)}</span>
                </div>
                {hasOptionals && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '4px', borderTop: `0.5px solid ${border}` }}>
                    <span style={{ fontSize: '11px', color: mid }}>Con opcionales</span>
                    <span style={{ fontSize: '13px', color: mid }}>{fmtEur(totalWithOpts)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Block palette */}
            <div style={{ padding: '18px 16px', flex: 1 }}>
              <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Añadir bloque</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {blockPalette.map(item => (
                  <button key={item.type}
                    onClick={() => setBlocks(prev => [...prev, mkBlock(item.type)])}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: surface, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.1s', width: '100%' }}
                    onMouseEnter={e => (e.currentTarget.style.background = card)}
                    onMouseLeave={e => (e.currentTarget.style.background = surface)}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: ink }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save action */}
            <div style={{ padding: '14px 16px', borderTop: `0.5px solid ${border}` }}>
              <button onClick={handleSave} disabled={!canSave}
                style={{ width: '100%', background: canSave ? surface : 'none', border: `0.5px solid ${border}`, color: canSave ? ink : mid, borderRadius: '8px', padding: '8px', fontSize: '13px', cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {saving ? 'Guardando...' : 'Guardar sin enviar'}
              </button>
            </div>
          </div>
        )}

        {/* Mobile/tablet backdrop for slide-up panel */}
        {isBelowDesktop && detailsOpen && (
          <div onClick={() => setDetailsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 55 }} />
        )}

        {/* Mobile/tablet sticky bottom bar */}
        {isBelowDesktop && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: card, borderTop: `0.5px solid ${border}`, padding: '8px 12px env(safe-area-inset-bottom, 8px)', display: 'flex', gap: '8px', zIndex: 50 }}>
            <button onClick={() => setDetailsOpen(true)}
              style={{ minHeight: '44px', background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '0 14px', fontSize: '13px', color: ink, cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', flexShrink: 0 }}>
              Detalles ↑
            </button>
            <button onClick={handleSave} disabled={!canSave}
              style={{ flex: 1, minHeight: '44px', background: surface, border: `1px solid ${border}`, color: canSave ? ink : mid, borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit', opacity: canSave ? 1 : 0.6 }}>
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button onClick={() => canSend ? setShowSendModal(true) : handleSave()} disabled={!canSave}
              style={{ flex: 1, minHeight: '44px', background: canSend ? primary : '#E2EBF2', color: canSend ? '#fff' : mid, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {sending ? 'Enviando...' : status === 'draft' ? '✉ Enviar al cliente' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
