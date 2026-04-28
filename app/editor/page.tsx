'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLogo from '@/components/UserLogo'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, mkBlock } from '@/components/BlockEditor'

const pageBg = '#D6E8F5'
const topbar = '#4A7FA5'
const ink = '#0F2A3D'
const mid = '#5A7A8F'
const border = '#B8D4E8'
const cardBg = 'rgba(255,255,255,0.82)'
const accent = '#4A7FA5'

type Step = 'picker' | 'editor'
type UserTemplate = { id: string; name: string; blocks: Block[]; icon: string; color: string }

const ICONS = ['📄','📝','💼','📢','📷','🖥️','🔨','⚡','🎯','🌟','💡','🏆']
const COLORS = ['#FAF7F3','#F5F0EB','#EAF4FB','#F0FDF4','#FDF2F8','#EFF6FF','#FAFAF9','#FEF9C3']

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.9)', border: `1px solid ${border}`,
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
  color: ink, outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
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
  const [tplName, setTplName] = useState('')
  const [tplIcon, setTplIcon] = useState('📄')
  const [tplColor, setTplColor] = useState('#FAF7F3')
  const [savingTpl, setSavingTpl] = useState(false)

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
    return supabase.from('proposals').insert({ user_id: uid, title, client_name: clientName, client_email: clientEmail, blocks, total_amount: computeTotal(blocks), status: 'draft' }).select('id').single()
  }

  const handleSave = async () => { setSaving(true); await persist(); router.push('/dashboard') }

  const handleSend = async () => {
    setSending(true)
    const { data } = await persist()
    if (!data?.id) { setSending(false); return }
    await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id }) })
    router.push('/dashboard')
  }

  // Guardar nueva plantilla
  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !userId) return
    setSavingTpl(true)
    const { data } = await supabase.from('templates').insert({ user_id: userId, name: tplName.trim(), blocks, icon: tplIcon, color: tplColor }).select('id, name, blocks, icon, color').single()
    if (data) setTemplates(prev => [{ ...data, icon: data.icon ?? '📄', color: data.color ?? '#FAF7F3' }, ...prev])
    setTplName(''); setTplIcon('📄'); setTplColor('#FAF7F3'); setShowModal(false); setSavingTpl(false)
  }

  // Actualizar plantilla activa
  const handleUpdateTemplate = async () => {
    if (!activeTpl || !userId) return
    setSavingTpl(true)
    await supabase.from('templates').update({ blocks }).eq('id', activeTpl.id)
    setTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, blocks } : t))
    setActiveTpl(prev => prev ? { ...prev, blocks } : prev)
    setSavingTpl(false)
    alert('Plantilla actualizada')
  }

  // Eliminar plantilla activa
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 60px 80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '400', color: ink, margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Mis plantillas</h1>
        <p style={{ fontSize: '14px', color: mid, margin: 0 }}>Elige una plantilla guardada o empieza desde cero</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: '16px', marginBottom: '16px' }}>
        {templates.map(tpl => (
          <button key={tpl.id} onClick={() => startWithTemplate(tpl)}
            style={{ background: tpl.color, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(74,127,165,0.08)' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = accent; b.style.boxShadow = '0 4px 16px rgba(74,127,165,0.2)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = border; b.style.boxShadow = '0 1px 4px rgba(74,127,165,0.08)' }}>
            <div style={{ fontSize: '32px', marginBottom: '14px' }}>{tpl.icon}</div>
            <p style={{ fontSize: '14px', fontWeight: '500', color: ink, margin: '0 0 4px' }}>{tpl.name}</p>
            <p style={{ fontSize: '11px', color: mid, margin: 0 }}>{tpl.blocks.length} bloques</p>
          </button>
        ))}
      </div>
      <button onClick={startEmpty}
        style={{ width: '100%', background: 'rgba(255,255,255,0.5)', border: `1px dashed ${border}`, borderRadius: '16px', padding: '20px', fontSize: '14px', color: mid, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
        Empezar desde cero →
      </button>
    </div>
  )

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,42,61,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', border: `1px solid ${border}`, boxShadow: '0 8px 40px rgba(74,127,165,0.2)' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', color: ink, margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Guardar como plantilla</p>
            <input style={{ ...inp, marginBottom: '16px' }} placeholder="Nombre de la plantilla" value={tplName} onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} autoFocus />
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>Icono</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setTplIcon(icon)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: tplIcon === icon ? `2px solid ${accent}` : `1px solid ${border}`, background: tplIcon === icon ? '#EAF4FB' : 'transparent', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: mid, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>Color de fondo</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {COLORS.map(color => (
                <button key={color} onClick={() => setTplColor(color)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: tplColor === color ? `2px solid ${accent}` : `1px solid ${border}`, cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowModal(false); setTplName('') }}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', padding: '10px', fontSize: '13px', color: mid, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSaveTemplate} disabled={!tplName.trim() || savingTpl}
                style={{ flex: 1, background: tplName.trim() && !savingTpl ? accent : border, color: tplName.trim() && !savingTpl ? '#fff' : mid, border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '500', cursor: tplName.trim() && !savingTpl ? 'pointer' : 'default' }}>
                {savingTpl ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: isMobile ? '20px 16px 80px' : '48px 40px 80px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: isMobile ? '24px' : '48px', alignItems: 'start' }}>

        <div style={{ position: isMobile ? 'static' : 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {templates.length > 0 && (
            <button onClick={() => setStep('picker')} style={{ background: 'none', border: 'none', color: mid, fontSize: '13px', cursor: 'pointer', padding: 0, textAlign: 'left', marginBottom: '4px' }}>
              ← Plantillas
            </button>
          )}

          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px', backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: '10px', color: mid, letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px' }}>Datos</p>
            <input style={inp} placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
            <input style={inp} placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
            <input style={inp} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          </div>

          {/* Botones de plantilla: distintos si viene de una plantilla o no */}
          {activeTpl ? (
            <>
              <button onClick={handleUpdateTemplate} disabled={savingTpl}
                style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${border}`, borderRadius: '20px', padding: '11px', fontSize: '13px', color: accent, cursor: 'pointer', fontWeight: '500', backdropFilter: 'blur(4px)' }}>
                {savingTpl ? 'Actualizando...' : `Actualizar "${activeTpl.name}"`}
              </button>
              <button onClick={handleDeleteTemplate}
                style={{ background: 'transparent', border: `1px solid #F0B8B8`, borderRadius: '20px', padding: '11px', fontSize: '13px', color: '#C4624A', cursor: 'pointer' }}>
                Eliminar plantilla
              </button>
            </>
          ) : (
            <button onClick={() => setShowModal(true)} style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${border}`, borderRadius: '20px', padding: '11px', fontSize: '13px', color: mid, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              Guardar como plantilla
            </button>
          )}

          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', color: mid, border: `1px solid ${border}`, padding: '11px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ background: canSave ? accent : border, color: canSave ? '#fff' : mid, border: 'none', padding: '11px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', cursor: canSave ? 'pointer' : 'default', boxShadow: canSave ? '0 4px 12px rgba(74,127,165,0.3)' : 'none' }}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button onClick={handleSend} disabled={!canSend}
            style={{ background: canSend ? '#4A9B6F' : '#C8E0D4', color: canSend ? '#fff' : '#8FBFAB', border: 'none', padding: '11px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', cursor: canSend ? 'pointer' : 'default', boxShadow: canSend ? '0 4px 12px rgba(74,155,111,0.3)' : 'none' }}>
            {sending ? 'Enviando...' : 'Enviar al cliente'}
          </button>
        </div>

        <div>
          <p style={{ fontSize: '10px', color: mid, letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 20px' }}>Contenido</p>
          <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
        </div>

      </div>
    </>
  )
}

export default function EditorPage() {
  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: topbar, padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0, boxShadow: '0 2px 16px rgba(74,127,165,0.2)' }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
        <div style={{ margin: '0 auto' }}><UserLogo /></div>
        <div style={{ width: '80px' }} />
      </div>
      <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '14px' }}>Cargando...</div>}>
        <EditorContent />
      </Suspense>
    </div>
  )
}