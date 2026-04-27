'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLogo from '@/components/UserLogo'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, mkBlock } from '@/components/BlockEditor'

type Step = 'template' | 'editor'

const TEMPLATES = [
  {
    id: 'marketing', icon: '📢', label: 'Agencia de marketing',
    intro: 'Gracias por confiar en nosotros para impulsar tu presencia digital. Hemos diseñado esta propuesta adaptada a tus objetivos, con acciones concretas que generarán resultados medibles desde el primer mes.',
    services: [
      { name: 'Estrategia de contenidos y SEO', price: 900 },
      { name: 'Gestión de redes sociales (2 canales)', price: 750 },
      { name: 'Campañas SEM (Google Ads)', price: 600 },
      { name: 'Analítica y reporting mensual', price: 350 },
    ],
  },
  {
    id: 'fotografia', icon: '📷', label: 'Fotografía',
    intro: 'Es un placer presentarte esta propuesta. Mi objetivo es capturar la esencia de tu proyecto con imágenes que transmitan exactamente lo que buscas, con total flexibilidad para adaptarme a tu calendario.',
    services: [
      { name: 'Sesión fotográfica (medio día)', price: 450 },
      { name: 'Edición y retoque profesional', price: 250 },
      { name: 'Entrega de galería digital', price: 100 },
      { name: 'Derechos de uso comercial', price: 200 },
    ],
  },
  {
    id: 'consultoria', icon: '💼', label: 'Consultoría',
    intro: 'Tras el análisis inicial de tu empresa, hemos identificado las áreas de mejora con mayor impacto. Esta propuesta recoge un plan de trabajo claro, con entregables definidos y un calendario realista.',
    services: [
      { name: 'Auditoría inicial y diagnóstico', price: 1200 },
      { name: 'Plan estratégico personalizado', price: 1800 },
      { name: 'Sesiones de seguimiento (×4)', price: 800 },
      { name: 'Informe final de resultados', price: 600 },
    ],
  },
  {
    id: 'diseno-web', icon: '🖥️', label: 'Diseño web',
    intro: 'Queremos ayudarte a tener una presencia online que refleje la calidad de tu negocio. Esta propuesta incluye diseño, desarrollo y puesta en marcha, con soporte incluido el primer mes.',
    services: [
      { name: 'Diseño UX/UI (hasta 5 páginas)', price: 1500 },
      { name: 'Desarrollo web a medida', price: 2500 },
      { name: 'SEO técnico y optimización', price: 600 },
      { name: 'Formación y mantenimiento (1 mes)', price: 400 },
    ],
  },
  {
    id: 'reformas', icon: '🔨', label: 'Reformas',
    intro: 'Presentamos nuestra propuesta para la reforma de tu espacio. Todos nuestros trabajos incluyen materiales de primera calidad, mano de obra especializada y limpieza final. Garantía de 2 años.',
    services: [
      { name: 'Demolición y preparación', price: 800 },
      { name: 'Obra civil y albañilería', price: 3500 },
      { name: 'Instalación eléctrica y fontanería', price: 1800 },
      { name: 'Acabados y pintura', price: 1200 },
    ],
  },
]

const inp: React.CSSProperties = {
  width: '100%', background: '#f5f4f0', border: '1px solid #e8e3dc',
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
  color: '#0f0f0f', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
}

function templateToBlocks(tpl: typeof TEMPLATES[0]): Block[] {
  return [
    { id: crypto.randomUUID(), type: 'text',     content: tpl.intro },
    { id: crypto.randomUUID(), type: 'services', content: tpl.services },
  ]
}

function EditorContent() {
  const router   = useRouter()
  const isMobile = useIsMobile()

  const [step,        setStep]        = useState<Step>('template')
  const [userId,      setUserId]      = useState<string | null>(null)
  const [title,       setTitle]       = useState('')
  const [clientName,  setClientName]  = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [blocks,      setBlocks]      = useState<Block[]>([])
  const [saving,      setSaving]      = useState(false)
  const [sending,     setSending]     = useState(false)

  const selectTemplate = async (tpl: typeof TEMPLATES[0] | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    setBlocks(tpl ? templateToBlocks(tpl) : [mkBlock('text')])
    setStep('editor')
  }

  const persist = async () => {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
    return supabase.from('proposals').insert({
      user_id: uid, title, client_name: clientName, client_email: clientEmail,
      blocks, total_amount: computeTotal(blocks), status: 'draft',
    }).select('id').single()
  }

  const handleSave = async () => {
    setSaving(true)
    await persist()
    router.push('/dashboard')
  }

  const handleSend = async () => {
    setSending(true)
    const { data } = await persist()
    if (!data?.id) { setSending(false); return }
    await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id }),
    })
    router.push('/dashboard')
  }

  const canSave = !!title && !saving && !sending
  const canSend = !!title && !!clientEmail && !saving && !sending

  /* ── Template picker ─────────────────────── */
  if (step === 'template') {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
            Elige una plantilla
          </h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0, fontFamily: 'sans-serif' }}>
            Empieza con datos de ejemplo o desde cero
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: '12px', marginBottom: '12px' }}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => selectTemplate(tpl)}
              style={{ background: '#fff', border: '1px solid #e8e3dc', borderRadius: '12px', padding: isMobile ? '16px' : '24px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#0f0f0f'; b.style.boxShadow = '0 0 0 3px #f0ede8' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e3dc'; b.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{tpl.icon}</div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: '#0f0f0f', margin: '0 0 4px', fontFamily: 'sans-serif' }}>{tpl.label}</p>
              <p style={{ fontSize: '11px', color: '#aaa', margin: 0, fontFamily: 'sans-serif' }}>
                {tpl.services.length} servicios · {tpl.services.reduce((s, sv) => s + sv.price, 0).toLocaleString('es-ES')}€
              </p>
            </button>
          ))}
        </div>

        <button onClick={() => selectTemplate(null)}
          style={{ width: '100%', background: 'transparent', border: '1px dashed #e8e3dc', borderRadius: '12px', padding: '18px', fontSize: '14px', color: '#888', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Empezar desde cero →
        </button>
      </div>
    )
  }

  /* ── Block editor ────────────────────────── */
  return (
    <div style={{
      maxWidth: '1280px', margin: '0 auto',
      padding: isMobile ? '20px 16px 80px' : '36px 32px 80px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '240px 1fr',
      gap: isMobile ? '20px' : '28px',
      alignItems: 'start',
    }}>

      {/* ── Sidebar ── */}
      <div style={{ position: isMobile ? 'static' : 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => setStep('template')}
          style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '13px', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'sans-serif', marginBottom: '4px' }}>
          ← Plantillas
        </button>

        {/* Metadata */}
        <div style={{ background: '#fff', border: '1px solid #e8e3dc', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: 'sans-serif' }}>Datos</p>
          <input style={inp} placeholder="Título de la propuesta" value={title}       onChange={e => setTitle(e.target.value)} />
          <input style={inp} placeholder="Nombre del cliente"     value={clientName}  onChange={e => setClientName(e.target.value)} />
          <input style={inp} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
        </div>

        {/* Actions */}
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', color: '#888', border: '1px solid #e8e3dc', padding: '11px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!canSave}
          style={{ background: canSave ? '#0f0f0f' : '#e8e3dc', color: canSave ? '#fff' : '#aaa', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: canSave ? 'pointer' : 'default', fontFamily: 'sans-serif', transition: 'background 0.15s' }}>
          {saving ? 'Guardando...' : 'Guardar borrador'}
        </button>
        <button onClick={handleSend} disabled={!canSend}
          style={{ background: canSend ? '#059669' : '#d1fae5', color: canSend ? '#fff' : '#6ee7b7', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: canSend ? 'pointer' : 'default', fontFamily: 'sans-serif', transition: 'background 0.15s' }}>
          {sending ? 'Enviando...' : 'Enviar al cliente'}
        </button>
      </div>

      {/* ── Canvas ── */}
      <div>
        <p style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: 'sans-serif' }}>
          Contenido
        </p>
        <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
      </div>

    </div>
  )
}

export default function EditorPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1C2B5E', padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0 }}>
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
