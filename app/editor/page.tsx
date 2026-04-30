'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLogo from '@/components/UserLogo'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, mkBlock } from '@/components/BlockEditor'

const pageBg = 'linear-gradient(160deg, #EDF5FC 0%, #F5F9FD 55%, #EAF3FA 100%)'
const topbar = '#0F2A3D'
const ink = '#0F2A3D'
const mid = '#6B8A9E'
const border = '#E2EBF2'
const cardBg = '#ffffff'
const accent = '#4A7FA5'

type Step = 'picker' | 'editor'
type UserTemplate = { id: string; name: string; blocks: Block[]; icon: string; color: string }

const ICONS = ['📄','📝','💼','📢','📷','🖥️','🔨','⚡','🎯','🌟','💡','🏆']
const COLORS = ['#FAF7F3','#F5F0EB','#EAF4FB','#F0FDF4','#FDF2F8','#EFF6FF','#FAFAF9','#FEF9C3']

const inp: React.CSSProperties = {
  width: '100%', background: '#fff', border: `1px solid #E2EBF2`,
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
  color: '#0F2A3D', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
}

function EditorContent() {
  const router = useRouter()
  const isMobile = useIsMobile()

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

  if (loadingTemplates) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '14px' }}>Cargando...</div>
  )

  if (step === 'picker') return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '52px 60px 80px' }}>
      <div style={{ marginBottom: '44px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: '400', color: ink, margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Elige una plantilla</h1>
        <p style={{ fontSize: '14px', color: mid, margin: 0 }}>Selecciona una de tus plantillas guardadas o empieza desde cero</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: '16px', marginBottom: '16px' }}>
        {templates.map(tpl => (
          <button key={tpl.id} onClick={() => startWithTemplate(tpl)}
            style={{ background: tpl.color, border: `1px solid ${border}`, borderRadius: '16px', padding: '28px 22px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = accent; b.style.boxShadow = '0 8px 24px rgba(74,127,165,0.18)'; b.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = border; b.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; b.style.transform = 'translateY(0)' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>{tpl.icon}</div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: ink, margin: '0 0 4px' }}>{tpl.name}</p>
            <p style={{ fontSize: '12px', color: mid, margin: 0 }}>{tpl.blocks.length} bloque{tpl.blocks.length !== 1 ? 's' : ''}</p>
          </button>
        ))}
      </div>
      <button onClick={startEmpty}
        style={{ width: '100%', background: 'rgba(255,255,255,0.6)', border: `1.5px dashed ${border}`, borderRadius: '16px', padding: '22px', fontSize: '14px', color: mid, cursor: 'pointer', fontWeight: '500', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.background = '#EAF4FB' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = mid; e.currentTarget.style.background = 'rgba(255,255,255,0.6)' }}>
        Empezar desde cero →
      </button>
    </div>
  )

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,42,61,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '420px', border: `1px solid ${border}`, boxShadow: '0 20px 60px rgba(10,26,41,0.25)' }}>
            <p style={{ fontSize: '18px', fontWeight: '400', color: ink, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>Guardar como plantilla</p>
            <p style={{ fontSize: '13px', color: mid, margin: '0 0 24px' }}>Ponle nombre y elige un icono para identificarla</p>
            <input style={{ ...inp, marginBottom: '20px' }} placeholder="Nombre de la plantilla" value={tplName} onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} autoFocus />
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 10px' }}>Icono</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setTplIcon(icon)}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: tplIcon === icon ? `2px solid ${accent}` : `1px solid ${border}`, background: tplIcon === icon ? '#EAF4FB' : '#FAFBFC', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                style={{ flex: 1, background: '#F8FAFC', border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '13px', color: mid, cursor: 'pointer', fontWeight: '500' }}>
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
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', border: `1px solid ${border}`, boxShadow: '0 20px 60px rgba(10,26,41,0.25)' }}>
            <p style={{ fontSize: '18px', fontWeight: '400', color: ink, margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Enviar al cliente</p>
            <p style={{ fontSize: '13px', color: mid, margin: '0 0 20px' }}>Se enviará un email a <strong style={{ color: ink }}>{clientEmail}</strong></p>
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 8px' }}>Mensaje personalizado (opcional)</p>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
              placeholder="Hola, te adjunto la propuesta que comentamos..."
              rows={4}
              style={{ width: '100%', background: '#fff', border: `1px solid ${border}`, borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: ink, outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => { setShowSendModal(false); setCustomMessage('') }}
                style={{ flex: 1, background: '#F8FAFC', border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '13px', color: mid, cursor: 'pointer', fontWeight: '500' }}>
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

      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: isMobile ? '24px 16px 80px' : '48px 40px 80px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: isMobile ? '24px' : '48px', alignItems: 'start' }}>

        <div style={{ position: isMobile ? 'static' : 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {templates.length > 0 && (
            <button onClick={() => setStep('picker')} style={{ background: 'none', border: 'none', color: mid, fontSize: '13px', cursor: 'pointer', padding: '0 0 4px', textAlign: 'left', fontWeight: '500' }}>
              ← Plantillas
            </button>
          )}

          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 2px' }}>Datos de la propuesta</p>
            <input style={inp} placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
            <input style={inp} placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
            <input style={inp} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            <div>
              <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '4px 0 6px' }}>Válida hasta</p>
              <input style={inp} type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div style={{ height: '1px', background: border, margin: '2px 0' }} />

          {activeTpl ? (
            <>
              <button onClick={handleUpdateTemplate} disabled={savingTpl}
                style={{ background: '#EAF4FB', border: `1px solid ${accent}`, borderRadius: '10px', padding: '11px', fontSize: '13px', color: accent, cursor: 'pointer', fontWeight: '600' }}>
                {savingTpl ? 'Actualizando...' : 'Actualizar plantilla'}
              </button>
              <button onClick={handleDeleteTemplate}
                style={{ background: 'transparent', border: '1px solid #FECACA', borderRadius: '10px', padding: '11px', fontSize: '13px', color: '#EF4444', cursor: 'pointer', fontWeight: '500' }}>
                Eliminar plantilla
              </button>
            </>
          ) : (
            <button onClick={() => setShowModal(true)} style={{ background: '#F8FAFC', border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '13px', color: mid, cursor: 'pointer', fontWeight: '500' }}>
              + Guardar como plantilla
            </button>
          )}

          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', color: mid, border: `1px solid ${border}`, padding: '11px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ background: canSave ? accent : '#E2EBF2', color: canSave ? '#fff' : mid, border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: canSave ? 'pointer' : 'default', boxShadow: canSave ? '0 4px 14px rgba(74,127,165,0.35)' : 'none', letterSpacing: '0.2px' }}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button onClick={() => setShowSendModal(true)} disabled={!canSend}
            style={{ background: canSend ? '#4A9B6F' : '#E2EBF2', color: canSend ? '#fff' : mid, border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: canSend ? 'pointer' : 'default', boxShadow: canSend ? '0 4px 14px rgba(74,155,111,0.35)' : 'none', letterSpacing: '0.2px' }}>
            {sending ? 'Enviando...' : '✉ Enviar al cliente'}
          </button>
        </div>

        <div>
          <p style={{ fontSize: '10px', color: mid, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 20px' }}>Contenido de la propuesta</p>
          <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
        </div>

      </div>
    </>
  )
}

export default function EditorPage() {
  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: topbar, padding: '0 24px', display: 'flex', alignItems: 'center', height: '64px', flexShrink: 0, boxShadow: '0 4px 24px rgba(10,26,41,0.3)' }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>← Dashboard</a>
        <div style={{ margin: '0 auto' }}><UserLogo /></div>
        <div style={{ width: '80px' }} />
      </div>
      <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '14px' }}>Cargando...</div>}>
        <EditorContent />
      </Suspense>
    </div>
  )
}
