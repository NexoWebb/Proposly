'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, mkBlock } from '@/components/BlockEditor'

const primary = '#4F6EF7'
const primaryLight = '#EEF1FE'

type Step = 'picker' | 'editor'
type UserTemplate = { id: string; name: string; blocks: Block[]; icon: string; color: string }

// Accent bar colors for template cards (one per position, cycles)
const ACCENT_BARS = ['#4F6EF7', '#639922', '#BA7517', '#378ADD', '#9B6DD8', '#E05252']

const sideInp: React.CSSProperties = {
  width: '100%', background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
  borderRadius: '8px', padding: '8px 10px', fontSize: '13px',
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const ghostBtn: React.CSSProperties = {
  background: 'none', border: '0.5px solid var(--border)', borderRadius: '8px',
  padding: '6px 12px', fontSize: '13px', color: 'var(--text-secondary)',
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
}

function EditorContent() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [step, setStep]                 = useState<Step>('picker')
  const [userId, setUserId]             = useState<string | null>(null)
  const [templates, setTemplates]       = useState<UserTemplate[]>([])
  const [loadingTemplates, setLoading]  = useState(true)
  const [activeTpl, setActiveTpl]       = useState<UserTemplate | null>(null)
  const [title, setTitle]               = useState('')
  const [clientName, setClientName]     = useState('')
  const [clientEmail, setClientEmail]   = useState('')
  const [blocks, setBlocks]             = useState<Block[]>([])
  const [saving, setSaving]             = useState(false)
  const [sending, setSending]           = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [showSendModal, setShowSend]    = useState(false)
  const [customMessage, setMsg]         = useState('')
  const [tplName, setTplName]           = useState('')
  const [savingTpl, setSavingTpl]       = useState(false)
  const [expiresAt, setExpiresAt]       = useState('')
  const [dark, setDark]                 = useState(false)

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('templates').select('id, name, blocks, icon, color').eq('user_id', user.id).order('created_at', { ascending: false })
      const tpls = (data ?? []).map(t => ({ ...t, icon: t.icon ?? '📄', color: t.color ?? '#FAF7F3' })) as UserTemplate[]
      setTemplates(tpls)
      if (tpls.length === 0) { setBlocks([mkBlock('text'), mkBlock('services')]); setStep('editor') }
      setLoading(false)
    }
    init()
  }, [])

  const handleSignOut   = async () => { await supabase.auth.signOut(); router.push('/login') }
  const toggleTheme     = () => { const n = !dark; setDark(n); document.documentElement.classList.toggle('dark', n); localStorage.setItem('theme', n ? 'dark' : 'light') }

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
    setSending(true); setShowSend(false)
    const { data } = await persist()
    if (!data?.id) { setSending(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    const res  = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ id: data.id, message: customMessage.trim() || undefined }) })
    const json = await res.json()
    if (!res.ok) { setSending(false); alert('Error al enviar: ' + (json.error ?? 'Error desconocido')); return }
    if (json.statusError) alert('Email enviado pero fallo al actualizar estado: ' + json.statusError)
    router.push('/dashboard')
  }

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !userId) return
    setSavingTpl(true)
    const { data } = await supabase.from('templates').insert({ user_id: userId, name: tplName.trim(), blocks, icon: '📄', color: '#FAF7F3' }).select('id, name, blocks, icon, color').single()
    if (data) setTemplates(prev => [{ ...data, icon: '📄', color: '#FAF7F3' }, ...prev])
    setTplName(''); setShowModal(false); setSavingTpl(false)
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
    setActiveTpl(null); setBlocks([mkBlock('text'), mkBlock('services')]); setStep('picker')
  }

  const canSave = !!title && !saving && !sending
  const canSend = !!title && !!clientEmail && !saving && !sending

  /* ── Picker nav (shared between loading + picker step) ── */
  const pickerNav = (
    <nav style={{ background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)', height: '52px', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
      <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', marginRight: '20px', color: 'var(--text-primary)' }}>
        propos<span style={{ color: primary }}>ly</span>
      </span>
      <a href="/dashboard" style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '5px 10px', borderRadius: '20px', textDecoration: 'none' }}>← Propuestas</a>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={toggleTheme} style={{ ...ghostBtn, padding: '5px 8px', fontSize: '14px' }}>{dark ? '☀' : '🌙'}</button>
        <a href="/settings" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block' }}>Ajustes</a>
        <button onClick={handleSignOut} style={ghostBtn}>Cerrar sesión</button>
      </div>
    </nav>
  )

  if (loadingTemplates) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)' }}>
      {pickerNav}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando...</div>
    </div>
  )

  /* ────────────────────────────────────────────────
     PAGE 1 — Template picker
  ──────────────────────────────────────────────── */
  if (step === 'picker') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)' }}>
      {pickerNav}
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: isMobile ? '32px 16px 60px' : '44px 32px 80px' }}>

        {/* Page header — same style as dashboard */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '500', margin: '0 0 4px', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Elige una plantilla</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Selecciona una de tus plantillas guardadas o empieza desde cero</p>
        </div>

        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
          {templates.map((tpl, idx) => {
            const bar = ACCENT_BARS[idx % ACCENT_BARS.length]
            return (
              <button key={tpl.id} onClick={() => startWithTemplate(tpl)}
                style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: 0, textAlign: 'left', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.12s, background 0.12s', display: 'flex', flexDirection: 'column' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.background = primaryLight }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}>
                <div style={{ height: '4px', background: bar, width: '100%', flexShrink: 0 }} />
                <div style={{ padding: '16px 18px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{tpl.blocks.length} bloque{tpl.blocks.length !== 1 ? 's' : ''}</p>
                </div>
              </button>
            )
          })}

          {/* "Empezar desde cero" — dashed card, same grid slot */}
          <button onClick={startEmpty}
            style={{ background: 'none', border: '0.5px dashed var(--border)', borderRadius: '12px', padding: '20px 18px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)', transition: 'border-color 0.12s, color 0.12s', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.color = primary }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
            Empezar desde cero →
          </button>
        </div>
      </div>
    </div>
  )

  /* ────────────────────────────────────────────────
     PAGE 2 — Editor
  ──────────────────────────────────────────────── */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)', overflow: 'hidden' }}>

      {/* ── Modals ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px', border: '0.5px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 4px' }}>Guardar como plantilla</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>Ponle nombre para identificarla</p>
            <input style={{ ...sideInp, marginBottom: '16px' }} placeholder="Nombre de la plantilla" value={tplName} onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} autoFocus />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowModal(false); setTplName('') }} style={{ ...ghostBtn, flex: 1, padding: '10px' }}>Cancelar</button>
              <button onClick={handleSaveTemplate} disabled={!tplName.trim() || savingTpl}
                style={{ flex: 1, background: tplName.trim() && !savingTpl ? primary : 'var(--bg-surface)', color: tplName.trim() && !savingTpl ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '500', cursor: tplName.trim() && !savingTpl ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {savingTpl ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', border: '0.5px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 6px' }}>Enviar al cliente</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>Se enviará un email a <strong style={{ color: 'var(--text-primary)' }}>{clientEmail}</strong></p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '500', margin: '0 0 8px' }}>Mensaje personalizado (opcional)</p>
            <textarea value={customMessage} onChange={e => setMsg(e.target.value)}
              placeholder="Hola, te adjunto la propuesta que comentamos..."
              rows={4}
              style={{ ...sideInp, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => { setShowSend(false); setMsg('') }} style={{ ...ghostBtn, flex: 1, padding: '10px' }}>Cancelar</button>
              <button onClick={handleSend} disabled={sending}
                style={{ flex: 1, background: sending ? 'var(--bg-surface)' : primary, color: sending ? 'var(--text-secondary)' : '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '500', cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {sending ? 'Enviando...' : '✉ Enviar propuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)', height: '52px', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '8px', flexShrink: 0, zIndex: 10 }}>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', color: 'var(--text-primary)', flexShrink: 0 }}>
          propos<span style={{ color: primary }}>ly</span>
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', flexShrink: 0 }}>›</span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nombre de la propuesta"
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', fontFamily: 'inherit', flex: 1, minWidth: 0 }}
        />
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '20px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
            Borrador
          </span>
          {!isMobile && (
            <>
              <button style={{ ...ghostBtn, opacity: 0.4, cursor: 'not-allowed' }} disabled>Vista previa</button>
              <button style={{ ...ghostBtn, opacity: 0.4, cursor: 'not-allowed' }} disabled>Copiar link</button>
            </>
          )}
          <button onClick={() => setShowSend(true)} disabled={!canSend}
            style={{ background: canSend ? primary : 'var(--bg-surface)', color: canSend ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '500', cursor: canSend ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: canSend ? 1 : 0.5 }}>
            {sending ? 'Enviando...' : '✉ Enviar propuesta'}
          </button>
        </div>
      </nav>

      {/* ── Body: sidebar | canvas ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden' }}>

        {/* Left sidebar */}
        <aside style={{
          width: isMobile ? '100%' : '260px',
          flexShrink: 0,
          background: 'var(--bg-card)',
          borderRight: isMobile ? 'none' : '0.5px solid var(--border)',
          borderBottom: isMobile ? '0.5px solid var(--border)' : 'none',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
        }}>

          {/* Datos de la propuesta */}
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500', margin: '0 0 12px' }}>Datos de la propuesta</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 5px' }}>Título</p>
                <input style={sideInp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre de la propuesta" />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 5px' }}>Nombre cliente</p>
                <input style={sideInp} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Empresa o nombre" />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 5px' }}>Email cliente</p>
                <input style={sideInp} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" />
              </div>
            </div>
          </div>

          {/* Validez */}
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500', margin: '0 0 8px' }}>Validez</p>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 5px' }}>Válida hasta</p>
              <input style={sideInp} type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'var(--border)' }} />

          {/* Template actions */}
          {activeTpl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button onClick={handleUpdateTemplate} disabled={savingTpl}
                style={{ ...ghostBtn, width: '100%', borderColor: primary, color: primary, textAlign: 'center' }}>
                {savingTpl ? 'Actualizando...' : 'Actualizar plantilla'}
              </button>
              <button onClick={handleDeleteTemplate}
                style={{ ...ghostBtn, width: '100%', borderColor: 'rgba(162,45,45,0.35)', color: '#A32D2D', textAlign: 'center' }}>
                Eliminar plantilla
              </button>
            </div>
          ) : (
            <button onClick={() => setShowModal(true)} style={{ ...ghostBtn, width: '100%', textAlign: 'center' }}>
              + Guardar como plantilla
            </button>
          )}

          {templates.length > 0 && (
            <button onClick={() => setStep('picker')} style={{ ...ghostBtn, width: '100%', textAlign: 'center' }}>
              ← Ver plantillas
            </button>
          )}

          <button onClick={() => router.push('/dashboard')} style={{ ...ghostBtn, width: '100%', textAlign: 'center' }}>
            Cancelar
          </button>

          <button onClick={handleSave} disabled={!canSave}
            style={{ width: '100%', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '9px', fontSize: '13px', color: canSave ? primary : 'var(--text-secondary)', cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: '500', opacity: canSave ? 1 : 0.5 }}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>

          <button onClick={() => setShowSend(true)} disabled={!canSend}
            style={{ width: '100%', background: canSend ? primary : 'var(--bg-surface)', color: canSend ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '500', cursor: canSend ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: canSend ? 1 : 0.5 }}>
            ✉ Enviar al cliente
          </button>
        </aside>

        {/* Right canvas */}
        <main style={{ flex: 1, padding: isMobile ? '20px 16px 60px' : '24px', overflowY: 'auto' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500', margin: '0 0 16px' }}>Contenido de la propuesta</p>
          <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
        </main>

      </div>
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        Cargando...
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}
