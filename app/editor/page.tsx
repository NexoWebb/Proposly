'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLogo from '@/components/UserLogo'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, mkBlock } from '@/components/BlockEditor'

type Step = 'picker' | 'editor'
type UserTemplate = { id: string; name: string; blocks: Block[]; icon: string; color: string }

const ICONS = ['📄','📝','💼','📢','📷','🖥️','🔨','⚡','🎯','🌟','💡','🏆']
const COLORS = ['#f5f4f0','#EEF2FF','#FFF7ED','#F0FDF4','#FDF2F8','#EFF6FF','#FAFAF9','#FEF9C3']

const inp: React.CSSProperties = {
  width: '100%', background: '#f5f4f0', border: '1px solid #e8e3dc',
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
  color: '#0f0f0f', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
}

function EditorContent() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [step, setStep] = useState<Step>('picker')
  const [userId, setUserId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<UserTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplIcon, setTplIcon] = useState('📄')
  const [tplColor, setTplColor] = useState('#f5f4f0')
  const [savingTpl, setSavingTpl] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('templates')
        .select('id, name, blocks, icon, color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const tpls = (data ?? []).map(t => ({ ...t, icon: t.icon ?? '📄', color: t.color ?? '#f5f4f0' })) as UserTemplate[]
      setTemplates(tpls)
      if (tpls.length === 0) {
        setBlocks([mkBlock('text'), mkBlock('services')])
        setStep('editor')
      }
      setLoadingTemplates(false)
    }
    init()
  }, [])

  const startWithTemplate = (tpl: UserTemplate) => {
    setBlocks(tpl.blocks.map(b => ({ ...b, id: crypto.randomUUID() })))
    setStep('editor')
  }

  const startEmpty = () => {
    setBlocks([mkBlock('text'), mkBlock('services')])
    setStep('editor')
  }

  const persist = async () => {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
    return supabase.from('proposals').insert({
      user_id: uid, title, client_name: clientName, client_email: clientEmail,
      blocks, total_amount: computeTotal(blocks), status: 'draft',
    }).select('id').single()
  }

  const handleSave = async () => { setSaving(true); await persist(); router.push('/dashboard') }

  const handleSend = async () => {
    setSending(true)
    const { data } = await persist()
    if (!data?.id) { setSending(false); return }
    await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id }) })
    router.push('/dashboard')
  }

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !userId) return
    setSavingTpl(true)
    const { data } = await supabase.from('templates')
      .insert({ user_id: userId, name: tplName.trim(), blocks, icon: tplIcon, color: tplColor })
      .select('id, name, blocks, icon, color').single()
    if (data) setTemplates(prev => [{ ...data, icon: data.icon ?? '📄', color: data.color ?? '#f5f4f0' }, ...prev])
    setTplName(''); setTplIcon('📄'); setTplColor('#f5f4f0')
    setShowModal(false); setSavingTpl(false)
  }

  const canSave = !!title && !saving && !sending
  const canSend = !!title && !!clientEmail && !saving && !sending

  if (loadingTemplates) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '14px' }}>Cargando...</div>
  )

  if (step === 'picker') return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 60px 80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
          Mis plantillas
        </h1>
        <p style={{ fontSize: '14px', color: '#888', margin: 0, fontFamily: 'sans-serif' }}>
          Elige una plantilla guardada o empieza desde cero
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: '12px', marginBottom: '16px' }}>
        {templates.map(tpl => (
          <button key={tpl.id} onClick={() => startWithTemplate(tpl)}
            style={{ background: tpl.color, border: '1px solid #e8e3dc', borderRadius: '12px', padding: '20px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = '#0f0f0f'; b.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = '#e8e3dc'; b.style.boxShadow = 'none' }}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{tpl.icon}</div>
            <p style={{ fontSize: '13px', fontWeight: '500', color: '#0f0f0f', margin: '0 0 4px', fontFamily: 'sans-serif' }}>{tpl.name}</p>
            <p style={{ fontSize: '11px', color: '#aaa', margin: 0, fontFamily: 'sans-serif' }}>{tpl.blocks.length} bloques</p>
          </button>
        ))}
      </div>
      <button onClick={startEmpty}
        style={{ width: '100%', background: 'transparent', border: '1px dashed #e8e3dc', borderRadius: '12px', padding: '18px', fontSize: '14px', color: '#888', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Empezar desde cero →
      </button>
    </div>
  )

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#0f0f0f', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Guardar como plantilla</p>

            <input style={{ ...inp, marginBottom: '16px' }} placeholder="Nombre de la plantilla" value={tplName}
              onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} autoFocus />

            <p style={{ fontSize: '11px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'sans-serif' }}>Icono</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setTplIcon(icon)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: tplIcon === icon ? '2px solid #0f0f0f' : '1px solid #e8e3dc', background: tplIcon === icon ? '#f5f4f0' : 'transparent', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '11px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'sans-serif' }}>Color de fondo</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {COLORS.map(color => (
                <button key={color} onClick={() => setTplColor(color)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: tplColor === color ? '2px solid #0f0f0f' : '1px solid #e8e3dc', cursor: 'pointer' }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowModal(false); setTplName('') }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #e8e3dc', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Cancelar
              </button>
              <button onClick={handleSaveTemplate} disabled={!tplName.trim() || savingTpl}
                style={{ flex: 1, background: tplName.trim() && !savingTpl ? '#0f0f0f' : '#e8e3dc', color: tplName.trim() && !savingTpl ? '#fff' : '#aaa', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '500', cursor: tplName.trim() && !savingTpl ? 'pointer' : 'default', fontFamily: 'sans-serif' }}>
                {savingTpl ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: isMobile ? '20px 16px 80px' : '48px 40px 80px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: isMobile ? '24px' : '48px', alignItems: 'start' }}>

        <div style={{ position: isMobile ? 'static' : 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {templates.length > 0 && (
            <button onClick={() => setStep('picker')}
              style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '13px', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'sans-serif', marginBottom: '4px' }}>
              ← Plantillas
            </button>
          )}
          <div style={{ background: '#fff', border: '1px solid #e8e3dc', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: 'sans-serif' }}>Datos</p>
            <input style={inp} placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
            <input style={inp} placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
            <input style={inp} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ background: 'transparent', border: '1px solid #e8e3dc', borderRadius: '10px', padding: '11px', fontSize: '13px', color: '#555', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Guardar como plantilla
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'transparent', color: '#888', border: '1px solid #e8e3dc', padding: '11px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ background: canSave ? '#0f0f0f' : '#e8e3dc', color: canSave ? '#fff' : '#aaa', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: canSave ? 'pointer' : 'default', fontFamily: 'sans-serif' }}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button onClick={handleSend} disabled={!canSend}
            style={{ background: canSend ? '#059669' : '#d1fae5', color: canSend ? '#fff' : '#6ee7b7', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: canSend ? 'pointer' : 'default', fontFamily: 'sans-serif' }}>
            {sending ? 'Enviando...' : 'Enviar al cliente'}
          </button>
        </div>

        <div>
          <p style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 20px', fontFamily: 'sans-serif' }}>Contenido</p>
          <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
        </div>

      </div>
    </>
  )
}

export default function EditorPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0f0f0f', padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0 }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
        <div style={{ margin: '0 auto' }}><UserLogo /></div>
        <div style={{ width: '80px' }} />
      </div>
      <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '14px' }}>Cargando...</div>}>
        <EditorContent />
      </Suspense>
    </div>
  )
}