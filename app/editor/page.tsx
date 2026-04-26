'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'

type Service = { name: string; price: number }
type Step = 'template' | 'form'

const TEMPLATES = [
  {
    id: 'marketing',
    icon: '📢',
    label: 'Agencia de marketing',
    intro: 'Gracias por confiar en nosotros para impulsar tu presencia digital. Hemos diseñado esta propuesta adaptada a tus objetivos, con acciones concretas que generarán resultados medibles desde el primer mes.',
    services: [
      { name: 'Estrategia de contenidos y SEO', price: 900 },
      { name: 'Gestión de redes sociales (2 canales)', price: 750 },
      { name: 'Campañas SEM (Google Ads)', price: 600 },
      { name: 'Analítica y reporting mensual', price: 350 },
    ],
  },
  {
    id: 'fotografia',
    icon: '📷',
    label: 'Fotografía',
    intro: 'Es un placer presentarte esta propuesta. Mi objetivo es capturar la esencia de tu proyecto con imágenes que transmitan exactamente lo que buscas, con total flexibilidad para adaptarme a tu calendario.',
    services: [
      { name: 'Sesión fotográfica (medio día)', price: 450 },
      { name: 'Edición y retoque profesional', price: 250 },
      { name: 'Entrega de galería digital', price: 100 },
      { name: 'Derechos de uso comercial', price: 200 },
    ],
  },
  {
    id: 'consultoria',
    icon: '💼',
    label: 'Consultoría',
    intro: 'Tras el análisis inicial de tu empresa, hemos identificado las áreas de mejora con mayor impacto. Esta propuesta recoge un plan de trabajo claro, con entregables definidos y un calendario realista.',
    services: [
      { name: 'Auditoría inicial y diagnóstico', price: 1200 },
      { name: 'Plan estratégico personalizado', price: 1800 },
      { name: 'Sesiones de seguimiento (×4)', price: 800 },
      { name: 'Informe final de resultados', price: 600 },
    ],
  },
  {
    id: 'diseno-web',
    icon: '🖥️',
    label: 'Diseño web',
    intro: 'Queremos ayudarte a tener una presencia online que refleje la calidad de tu negocio. Esta propuesta incluye diseño, desarrollo y puesta en marcha, con soporte incluido el primer mes.',
    services: [
      { name: 'Diseño UX/UI (hasta 5 páginas)', price: 1500 },
      { name: 'Desarrollo web a medida', price: 2500 },
      { name: 'SEO técnico y optimización', price: 600 },
      { name: 'Formación y mantenimiento (1 mes)', price: 400 },
    ],
  },
  {
    id: 'reformas',
    icon: '🔨',
    label: 'Reformas',
    intro: 'Presentamos nuestra propuesta para la reforma de tu espacio. Todos nuestros trabajos incluyen materiales de primera calidad, mano de obra especializada y limpieza final. Garantía de 2 años.',
    services: [
      { name: 'Demolición y preparación', price: 800 },
      { name: 'Obra civil y albañilería', price: 3500 },
      { name: 'Instalación eléctrica y fontanería', price: 1800 },
      { name: 'Acabados y pintura', price: 1200 },
    ],
  },
]

const input: React.CSSProperties = {
  width: '100%',
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: '#0F172A',
  outline: 'none',
  fontFamily: 'sans-serif',
  boxSizing: 'border-box',
}

function EditorContent() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [step, setStep] = useState<Step>('template')
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [intro, setIntro] = useState('')
  const [services, setServices] = useState<Service[]>([{ name: '', price: 0 }])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const selectTemplate = (tpl: typeof TEMPLATES[0] | null) => {
    if (tpl) {
      setIntro(tpl.intro)
      setServices(tpl.services)
    } else {
      setIntro('')
      setServices([{ name: '', price: 0 }])
    }
    setStep('form')
  }

  const total = services.reduce((sum, s) => sum + Number(s.price), 0)
  const addService = () => setServices([...services, { name: '', price: 0 }])
  const updateService = (i: number, field: keyof Service, val: string) => {
    const u = [...services]
    u[i] = { ...u[i], [field]: field === 'price' ? Number(val) : val }
    setServices(u)
  }
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i))

  const buildBlocks = () => [
    { type: 'intro', content: intro },
    { type: 'services', content: services },
  ]

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('proposals').insert({
      user_id: user?.id, title, client_name: clientName,
      client_email: clientEmail, blocks: buildBlocks(), total_amount: total, status: 'draft',
    })
    router.push('/dashboard')
  }

  const handleSend = async () => {
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('proposals').insert({
      user_id: user?.id, title, client_name: clientName,
      client_email: clientEmail, blocks: buildBlocks(), total_amount: total, status: 'draft',
    }).select('id').single()

    if (!data?.id) { setSending(false); return }

    await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id }),
    })
    router.push('/dashboard')
  }

  if (step === 'template') {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '400', color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
            Elige una plantilla
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Empieza con datos de ejemplo o desde cero
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: '14px', marginBottom: '14px' }}>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => selectTemplate(tpl)}
              style={{
                background: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#4361EE'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px #EEF2FF'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2E8F0'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{tpl.icon}</div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#0F172A', margin: '0 0 6px' }}>{tpl.label}</p>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                {tpl.services.length} servicios · {tpl.services.reduce((s, sv) => s + sv.price, 0).toLocaleString('es-ES')}€
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={() => selectTemplate(null)}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px dashed #CBD5E1',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '14px',
            color: '#64748B',
            cursor: 'pointer',
          }}
        >
          Empezar desde cero →
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 40px 80px' }}>
      <div style={{ marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setStep('template')}
          style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '13px', cursor: 'pointer', padding: 0 }}
        >
          ← Plantillas
        </button>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '400', color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
            Nueva propuesta
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Completa los datos y envíala como link a tu cliente</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 18px' }}>Datos de la propuesta</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input style={input} type="text" placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
              <input style={input} type="text" placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
              <input style={input} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 18px' }}>Introducción</p>
            <textarea
              style={{ ...input, resize: 'vertical', lineHeight: '1.7', minHeight: '160px' }}
              placeholder="Escribe una introducción personalizada para tu cliente..."
              value={intro}
              onChange={e => setIntro(e.target.value)}
              rows={7}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 18px' }}>Servicios</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {services.map((service, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input style={{ ...input, flex: 1 }} type="text" placeholder="Nombre del servicio" value={service.name} onChange={e => updateService(i, 'name', e.target.value)} />
                  <input style={{ ...input, width: '120px', flex: 'none' }} type="number" placeholder="Precio €" value={service.price || ''} onChange={e => updateService(i, 'price', e.target.value)} />
                  <button onClick={() => removeService(i)} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={addService} style={{ width: '100%', background: 'transparent', border: '1px dashed #CBD5E1', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#94A3B8', cursor: 'pointer' }}>
              + Añadir servicio
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Total sin IVA</span>
              <span style={{ fontSize: '26px', fontWeight: '400', color: '#0F172A', fontFamily: 'Georgia, serif' }}>{total.toLocaleString('es-ES')}€</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => router.push('/dashboard')} style={{ flex: 1, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', padding: '13px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || sending || !title}
              style={{ flex: 1, background: saving || !title ? '#C7D2FE' : '#4361EE', color: saving || !title ? '#818CF8' : '#fff', border: 'none', padding: '13px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: saving || !title ? 'default' : 'pointer' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || saving || !title || !clientEmail}
              style={{ flex: 2, background: sending || !title || !clientEmail ? '#A7F3D0' : '#059669', color: sending || !title || !clientEmail ? '#6EE7B7' : '#fff', border: 'none', padding: '13px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: sending || !title || !clientEmail ? 'default' : 'pointer' }}
            >
              {sending ? 'Enviando...' : 'Enviar al cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditorPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1C2B5E', padding: '0 40px', display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0 }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Dashboard
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
          <span style={{ color: '#ffffff', fontSize: '15px', letterSpacing: '-0.3px', fontWeight: '500' }}>Proposly</span>
        </div>
        <div style={{ width: '80px' }} />
      </div>
      <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '14px' }}>Cargando...</div>}>
        <EditorContent />
      </Suspense>
    </div>
  )
}
