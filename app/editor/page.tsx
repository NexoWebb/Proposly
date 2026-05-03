'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, computeTotalWithOptionals, mkBlock } from '@/components/BlockEditor'

const ink = 'var(--text-primary)'
const mid = 'var(--text-secondary)'
const border = 'var(--border)'
const cardBg = 'var(--bg-card)'
const surface = 'var(--bg-surface)'
const accent = '#4A7FA5'
const primary = '#4F6EF7'

type Step = 'picker' | 'editor'
type UserTemplate = { id: string; name: string; blocks: Block[]; icon: string; color: string }

const ICONS = ['📄','📝','💼','📢','📷','🖥️','🔨','⚡','🎯','🌟','💡','🏆']
const COLORS = ['#FAF7F3','#F5F0EB','#EAF4FB','#F0FDF4','#FDF2F8','#EFF6FF','#FAFAF9','#FEF9C3']

const PALETTE: { label: string; type: Block['type'] }[] = [
  { label: 'Encabezado', type: 'header' },
  { label: 'Texto', type: 'text' },
  { label: 'Servicios', type: 'services' },
  { label: 'Imagen', type: 'image' },
  { label: 'Separador', type: 'separator' },
]

const inp: React.CSSProperties = {
  width: '100%', background: surface, border: `1px solid ${border}`,
  borderRadius: '8px', padding: '9px 12px', fontSize: '13px',
  color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

function EditorContent() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const isBelowDesktop = useIsMobile(1024)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [step, setStep] = useState<Step>('picker')
  const [userId, setUserId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<UserTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [activeTpl, setActiveTpl] = useState<UserTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [tplName, setTplName] = useState('')
  const [tplIcon, setTplIcon] = useState('📄')
  const [tplColor, setTplColor] = useState('#FAF7F3')
  const [savingTpl, setSavingTpl] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('templates').select('id, name, blocks, icon, color').eq('user_id', user.id).order('created_at', { ascending: false })
      const tpls = (data ?? []).map(t => ({ ...t, icon: t.icon ?? '📄', color: t.color ?? '#FAF7F3' })) as UserTemplate[]
      setTemplates(tpls)
      if (tpls.length === 0) { setBlocks([mkBlock('text'), mkBlock('services')]); setStep('editor') }
      setLoadingTemplates(false)
    }
    init()
  }, [])

  const startWithTemplate = (tpl: UserTemplate) => {
    setActiveTpl(tpl)
    setBlocks(tpl.blocks.map(b => ({ ...b, id: crypto.randomUUID() })))
    setStep('editor')
  }

  const startEmpty = () => {
    setActiveTpl(null)
    setBlocks([mkBlock('text'), mkBlock('services')])
    setStep('editor')
  }

  const persist = async () => {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
    return supabase.from('proposals').insert({ user_id: uid, title, client_name: clientName, client_email: clientEmail, blocks, total_amount: computeTotal(blocks), status: 'draft', expires_at: expiresAt || null }).select('id').single()
  }

  const handleSave = async () => { setSaving(true); await persist(); router.push('/dashboard') }

  const handleSend = async () => {
    setSending(true)
    setShowSendModal(false)
    const { data } = await persist()
    if (!data?.id) { setSending(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ id: data.id, message: customMessage.trim() || undefined }) })
    const json = await res.json()
    if (!res.ok) { setSending(false); alert('Error al enviar: ' + (json.error ?? 'Error desconocido')); return }
    if (json.statusError) alert('Email enviado pero fallo al actualizar estado: ' + json.statusError)
    router.push('/dashboard')
  }

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !userId) return
    setSavingTpl(true)
    const { data } = await supabase.from('templates').insert({ user_id: userId, name: tplName.trim(), blocks, icon: tplIcon, color: tplColor }).select('id, name, blocks, icon, color').single()
    if (data) setTemplates(prev => [{ ...data, icon: data.icon ?? '📄', color: data.color ?? '#FAF7F3' }, ...prev])
    setTplName(''); setTplIcon('📄'); setTplColor('#FAF7F3'); setShowModal(false); setSavingTpl(false)
  }

  const handleUpdateTemplate = async () => {
    if (!activeTpl || !userId) return
    setSavingTpl(true)
    await supabase.from('templates').update({ blocks }).eq('id', activeTpl.id)
    setTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, blocks } : t))
    setActiveTpl(prev => prev ? { ...prev, blocks } : prev)
    setSavingTpl(false)
    alert('Plantilla actualizada')
  }

  const handleDeleteTemplate = async () => {
    if (!activeTpl || !userId) return
    if (!window.confirm(`¿Eliminar la plantilla "${activeTpl.name}"? Esta acción no se puede deshacer.`)) return
    await supabase.from('templates').delete().eq('id', activeTpl.id)
    setTemplates(prev => prev.filter(t => t.id !== activeTpl.id))
    setActiveTpl(null)
    setBlocks([mkBlock('text'), mkBlock('services')])
    setStep('picker')
  }

  const canSave = !!title && !saving && !sending
  const canSend = !!title && !!clientEmail && !saving && !sending
  const total = computeTotal(blocks)
  const totalWithOpts = computeTotalWithOptionals(blocks)
  const hasOptionals = totalWithOpts > total

  if (loadingTemplates) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '14px' }}>Cargando...</div>
  )

  if (step === 'picker') return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '52px 60px 80px' }}>
      <div style={{ marginBottom: '44px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: '400', color: ink, margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Elige una plantilla</h1>
        <p style={{ fontSize: '14px', color: mid, margin: 0 }}>Selecciona una de tus plantillas guardadas o empieza desde cero</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isBelowDesktop ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {templates.map(tpl => (
          <button key={tpl.id} onClick={() => startWithTemplate(tpl)}
            style={{ background: 'var(--bg-card)', border: `1px solid ${border}`, borderRadius: '16px', padding: '28px 22px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = accent; b.style.boxShadow = '0 8px 24px rgba(74,127,165,0.18)'; b.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; b.style.transform = 'translateY(0)' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>{tpl.icon}</div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: ink, margin: '0 0 4px' }}>{tpl.name}</p>
            <p style={{ fontSize: '12px', color: mid, margin: 0 }}>{tpl.blocks.length} bloque{tpl.blocks.length !== 1 ? 's' : ''}</p>
          </button>
        ))}
      </div>
      <button onClick={startEmpty}
        style={{ width: '100%', background: 'var(--bg-card)', border: `1.5px dashed ${border}`, borderRadius: '16px', padding: '22px', fontSize: '14px', color: mid, cursor: 'pointer', fontWeight: '500', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.background = '#EAF4FB' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-card)' }}>
        Empezar desde cero →
      </button>
    </div>
  )

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,42,61,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '420px', border: `1px solid ${border}`, boxShadow: '0 20px 60px rgba(10,26,41,0.25)' }}>
            <p style={{ fontSize: '18px', fontWeight: '400', color: ink, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Guardar como plantilla</p>
            <p style={{ fontSize: '13px', color: mid, margin: '0 0 24px' }}>Ponle nombre y elige un icono para identificarla</p>
            <input style={{ ...inp, marginBottom: '20px' }} placeholder="Nombre de la plantilla" value={tplName} onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} autoFocus />
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 10px' }}>Icono</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setTplIcon(icon)}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: tplIcon === icon ? `2px solid ${accent}` : `1px solid ${border}`, background: tplIcon === icon ? '#EAF4FB' : 'var(--bg-surface)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 10px' }}>Color de fondo</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {COLORS.map(color => (
                <button key={color} onClick={() => setTplColor(color)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: tplColor === color ? `2px solid ${accent}` : `1px solid ${border}`, cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowModal(false); setTplName('') }}
                style={{ flex: 1, background: 'var(--bg-surface)', border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '13px', color: mid, cursor: 'pointer', fontWeight: '500' }}>
                Cancelar
              </button>
              <button onClick={handleSaveTemplate} disabled={!tplName.trim() || savingTpl}
                style={{ flex: 1, background: tplName.trim() && !savingTpl ? accent : '#E2EBF2', color: tplName.trim() && !savingTpl ? '#fff' : mid, border: 'none', borderRadius: '10px', padding: '11px', fontSize: '13px', fontWeight: '700', cursor: tplName.trim() && !savingTpl ? 'pointer' : 'default', boxShadow: tplName.trim() ? '0 4px 12px rgba(74,127,165,0.3)' : 'none' }}>
                {savingTpl ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,42,61,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', border: `1px solid ${border}`, boxShadow: '0 20px 60px rgba(10,26,41,0.25)' }}>
            <p style={{ fontSize: '18px', fontWeight: '400', color: ink, margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Enviar al cliente</p>
            <p style={{ fontSize: '13px', color: mid, margin: '0 0 20px' }}>Se enviará un email a <strong style={{ color: ink }}>{clientEmail}</strong></p>
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 8px' }}>Mensaje personalizado (opcional)</p>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
              placeholder="Hola, te adjunto la propuesta que comentamos..."
              rows={4}
              style={{ width: '100%', background: 'var(--bg-surface)', border: `1px solid ${border}`, borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: ink, outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => { setShowSendModal(false); setCustomMessage('') }}
                style={{ flex: 1, background: 'var(--bg-surface)', border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '13px', color: mid, cursor: 'pointer', fontWeight: '500' }}>
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending}
                style={{ flex: 1, background: sending ? '#C8E0D4' : '#4A9B6F', color: sending ? '#8FBFAB' : '#fff', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '13px', fontWeight: '700', cursor: sending ? 'default' : 'pointer', boxShadow: sending ? 'none' : '0 4px 14px rgba(74,155,111,0.35)' }}>
                {sending ? 'Enviando...' : '✉ Enviar propuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor: canvas left | sidebar right */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: isMobile ? '20px 16px 96px' : isBelowDesktop ? '24px 24px 96px' : '32px 32px 80px', display: 'grid', gridTemplateColumns: isBelowDesktop ? '1fr' : '1fr 240px', gap: isBelowDesktop ? '24px' : '32px', alignItems: 'start' }}>

        {/* Canvas */}
        <div>
          <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 16px' }}>Contenido de la propuesta</p>
          <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
        </div>

        {/* Sidebar — desktop inline, below-desktop inside slide-up panel */}
        <div style={{
          position: isBelowDesktop ? 'fixed' : 'sticky',
          top: isBelowDesktop ? 'auto' : '68px',
          left: isBelowDesktop ? 0 : 'auto',
          right: isBelowDesktop ? 0 : 'auto',
          bottom: isBelowDesktop ? 0 : 'auto',
          maxHeight: isBelowDesktop ? '85vh' : 'none',
          width: isBelowDesktop ? '100%' : 'auto',
          background: isBelowDesktop ? 'var(--bg-page)' : 'transparent',
          borderTopLeftRadius: isBelowDesktop ? '16px' : 0,
          borderTopRightRadius: isBelowDesktop ? '16px' : 0,
          borderTop: isBelowDesktop ? `0.5px solid ${border}` : 'none',
          boxShadow: isBelowDesktop ? '0 -8px 24px rgba(0,0,0,0.12)' : 'none',
          padding: isBelowDesktop ? '10px 16px 24px' : 0,
          overflowY: isBelowDesktop ? 'auto' : 'visible',
          zIndex: isBelowDesktop ? 60 : 'auto',
          transform: isBelowDesktop ? (detailsOpen ? 'translateY(0)' : 'translateY(100%)') : 'none',
          transition: isBelowDesktop ? 'transform 0.25s ease' : 'none',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {isBelowDesktop && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 8px' }}>
              <div style={{ width: '36px', height: '4px', background: border, borderRadius: '2px', margin: '0 auto' }} />
              <button onClick={() => setDetailsOpen(false)} aria-label="Cerrar"
                style={{ position: 'absolute', right: '12px', top: '8px', width: '32px', height: '32px', background: 'none', border: 'none', cursor: 'pointer', color: mid, fontSize: '18px' }}>×</button>
            </div>
          )}

          {templates.length > 0 && (
            <button onClick={() => setStep('picker')} style={{ background: 'none', border: 'none', color: mid, fontSize: '13px', cursor: 'pointer', padding: '0 0 4px', textAlign: 'left', fontWeight: '500' }}>
              ← Plantillas
            </button>
          )}

          {/* Client data */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 2px' }}>Datos del cliente</p>
            <input style={inp} placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
            <input style={inp} placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
            <input style={inp} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            <div>
              <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '4px 0 6px' }}>Válida hasta</p>
              <input style={inp} type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          {/* Economic summary */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 10px' }}>Resumen económico</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: hasOptionals ? '6px' : 0 }}>
              <span style={{ fontSize: '13px', color: mid }}>Total base</span>
              <span style={{ fontSize: '20px', fontWeight: '600', color: ink, fontVariantNumeric: 'tabular-nums' }}>
                {total.toLocaleString('es-ES')} €
              </span>
            </div>
            {hasOptionals && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', color: mid }}>Con opcionales</span>
                <span style={{ fontSize: '14px', color: mid, fontVariantNumeric: 'tabular-nums' }}>
                  {totalWithOpts.toLocaleString('es-ES')} €
                </span>
              </div>
            )}
          </div>

          {/* Block palette */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 10px' }}>Añadir bloque</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {PALETTE.map(({ label, type }) => (
                <button key={type} onClick={() => setBlocks(prev => [...prev, mkBlock(type)])}
                  style={{ background: 'var(--bg-surface)', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 6px', fontSize: '12px', color: ink, cursor: 'pointer', fontWeight: '500', textAlign: 'center', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = '#EAF4FB'; e.currentTarget.style.color = accent }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-primary)' }}>
                  + {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: border, margin: '2px 0' }} />

          {activeTpl ? (
            <>
              <button onClick={handleUpdateTemplate} disabled={savingTpl}
                style={{ background: '#EAF4FB', border: `1px solid ${accent}`, borderRadius: '10px', padding: '10px', fontSize: '13px', color: accent, cursor: 'pointer', fontWeight: '600' }}>
                {savingTpl ? 'Actualizando...' : 'Actualizar plantilla'}
              </button>
              <button onClick={handleDeleteTemplate}
                style={{ background: 'transparent', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#EF4444', cursor: 'pointer', fontWeight: '500' }}>
                Eliminar plantilla
              </button>
            </>
          ) : (
            <button onClick={() => setShowModal(true)} style={{ background: '#F8FAFC', border: `1px solid ${border}`, borderRadius: '10px', padding: '10px', fontSize: '13px', color: mid, cursor: 'pointer', fontWeight: '500' }}>
              + Guardar como plantilla
            </button>
          )}

          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', color: mid, border: `1px solid ${border}`, padding: '10px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ background: canSave ? accent : '#E2EBF2', color: canSave ? '#fff' : mid, border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: canSave ? 'pointer' : 'default', boxShadow: canSave ? '0 4px 14px rgba(74,127,165,0.35)' : 'none' }}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button onClick={() => setShowSendModal(true)} disabled={!canSend}
            style={{ background: canSend ? '#4A9B6F' : '#E2EBF2', color: canSend ? '#fff' : mid, border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: canSend ? 'pointer' : 'default', boxShadow: canSend ? '0 4px 14px rgba(74,155,111,0.35)' : 'none' }}>
            {sending ? 'Enviando...' : '✉ Enviar al cliente'}
          </button>
        </div>
      </div>

      {/* Mobile/tablet backdrop for slide-up panel */}
      {isBelowDesktop && detailsOpen && (
        <div onClick={() => setDetailsOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 55 }} />
      )}

      {/* Mobile/tablet sticky bottom bar */}
      {isBelowDesktop && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: cardBg, borderTop: `0.5px solid ${border}`, padding: '8px 12px env(safe-area-inset-bottom, 8px)', display: 'flex', gap: '8px', zIndex: 50 }}>
          <button onClick={() => setDetailsOpen(true)}
            style={{ minHeight: '44px', background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '0 14px', fontSize: '13px', color: ink, cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', flexShrink: 0 }}>
            Detalles ↑
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ flex: 1, minHeight: '44px', background: canSave ? surface : surface, border: `1px solid ${border}`, color: canSave ? ink : mid, borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit', opacity: canSave ? 1 : 0.6 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={() => setShowSendModal(true)} disabled={!canSend}
            style={{ flex: 1, minHeight: '44px', background: canSend ? '#4A9B6F' : '#E2EBF2', color: canSend ? '#fff' : mid, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: canSend ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            {sending ? '...' : '✉ Enviar'}
          </button>
        </div>
      )}
    </>
  )
}

export default function EditorPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    if (!localStorage.getItem('theme')) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase.from('profiles').select('theme_preference').eq('user_id', user.id).single().then(({ data }) => {
          const pref = (data as { theme_preference?: string } | null)?.theme_preference
          if (pref) {
            localStorage.setItem('theme', pref)
            document.documentElement.classList.toggle('dark', pref === 'dark')
            setDark(pref === 'dark')
          }
        })
      })
    }
  }, [])
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }
  const toggleTheme = async () => { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); localStorage.setItem('theme', next ? 'dark' : 'light'); const { data: { user } } = await supabase.auth.getUser(); if (user) supabase.from('profiles').update({ theme_preference: next ? 'dark' : 'light' }).eq('user_id', user.id) }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <nav style={{ background: 'var(--bg-card, #fff)', borderBottom: '0.5px solid var(--border, #E8EDF2)', height: '52px', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', marginRight: '20px', color: ink }}>
          propos<span style={{ color: primary }}>ly</span>
        </span>
        {!isMobile && (
          <a href="/dashboard" style={{ fontSize: '13px', color: mid, padding: '5px 10px', borderRadius: '20px', textDecoration: 'none' }}>← Propuestas</a>
        )}
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
                style={{ position: 'fixed', top: '52px', left: 0, right: 0, background: 'var(--bg-card)', borderBottom: `0.5px solid var(--border)`, padding: '8px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 20 }}>
                <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid var(--border)` }}>← Propuestas</a>
                <a href="/settings" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid var(--border)` }}>Ajustes</a>
                <button onClick={() => { setMenuOpen(false); handleSignOut() }} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: `0.5px solid var(--border)` }}>Cerrar sesión</button>
                <button onClick={() => { setMenuOpen(false); toggleTheme() }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span>Modo {dark ? 'claro' : 'oscuro'}</span><span>{dark ? '☀' : '🌙'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={toggleTheme}
              style={{ fontSize: '14px', background: 'none', border: '0.5px solid var(--border, #E8EDF2)', padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', color: mid }}>
              {dark ? '☀' : '🌙'}
            </button>
            <a href="/settings" style={{ fontSize: '13px', color: mid, textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '0.5px solid var(--border, #E8EDF2)' }}>Ajustes</a>
            <button onClick={handleSignOut} style={{ fontSize: '13px', color: mid, background: 'none', border: '0.5px solid var(--border, #E8EDF2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </nav>
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: mid, fontSize: '14px' }}>Cargando...</div>}>
        <EditorContent />
      </Suspense>
    </div>
  )
}
