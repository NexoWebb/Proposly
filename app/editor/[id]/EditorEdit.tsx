'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Service = {
  name: string
  price: number
}

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

export default function EditorEdit({ id }: { id: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [intro, setIntro] = useState('')
  const [services, setServices] = useState<Service[]>([{ name: '', price: 0 }])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) { router.replace('/dashboard'); return }
      if (data.status === 'signed') { router.replace(`/p/${id}`); return }

      setTitle(data.title ?? '')
      setClientName(data.client_name ?? '')
      setClientEmail(data.client_email ?? '')
      const introBlock = data.blocks?.find((b: { type: string }) => b.type === 'intro')
      const servicesBlock = data.blocks?.find((b: { type: string }) => b.type === 'services')
      if (introBlock?.content) setIntro(introBlock.content as string)
      if (servicesBlock?.content?.length) setServices(servicesBlock.content as Service[])
      setLoading(false)
    }
    load()
  }, [id, router])

  const total = services.reduce((sum, s) => sum + Number(s.price), 0)

  const addService = () => setServices([...services, { name: '', price: 0 }])

  const updateService = (index: number, field: keyof Service, value: string) => {
    const updated = [...services]
    updated[index] = { ...updated[index], [field]: field === 'price' ? Number(value) : value }
    setServices(updated)
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    const blocks = [
      { type: 'intro', content: intro },
      { type: 'services', content: services },
    ]
    await supabase
      .from('proposals')
      .update({ title, client_name: clientName, client_email: clientEmail, blocks, total_amount: total })
      .eq('id', id)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '14px' }}>
        Cargando propuesta...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '48px 40px 80px' }}>

      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '400', color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
          Editar propuesta
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Modifica los datos y guarda los cambios
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 18px' }}>
              Datos de la propuesta
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input style={input} type="text" placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
              <input style={input} type="text" placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
              <input style={input} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 18px' }}>
              Introducción
            </p>
            <textarea
              style={{ ...input, resize: 'vertical', lineHeight: '1.7', minHeight: '160px' }}
              placeholder="Escribe una introducción personalizada para tu cliente..."
              value={intro}
              onChange={e => setIntro(e.target.value)}
              rows={7}
            />
          </div>

        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 18px' }}>
              Servicios
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {services.map((service, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    style={{ ...input, flex: 1 }}
                    type="text"
                    placeholder="Nombre del servicio"
                    value={service.name}
                    onChange={e => updateService(index, 'name', e.target.value)}
                  />
                  <input
                    style={{ ...input, width: '120px', flex: 'none' }}
                    type="number"
                    placeholder="Precio €"
                    value={service.price || ''}
                    onChange={e => updateService(index, 'price', e.target.value)}
                  />
                  <button
                    onClick={() => removeService(index)}
                    style={{ background: 'transparent', border: 'none', color: '#CBD5E1', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addService}
              style={{ width: '100%', background: 'transparent', border: '1px dashed #CBD5E1', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#94A3B8', cursor: 'pointer' }}
            >
              + Añadir servicio
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Total sin IVA</span>
              <span style={{ fontSize: '26px', fontWeight: '400', color: '#0F172A', fontFamily: 'Georgia, serif' }}>
                {total.toLocaleString('es-ES')}€
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ flex: 1, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', padding: '13px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title}
              style={{
                flex: 2,
                background: saving || !title ? '#C7D2FE' : '#4361EE',
                color: saving || !title ? '#818CF8' : '#fff',
                border: 'none',
                padding: '13px 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving || !title ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
