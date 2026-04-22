'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  name: string
  price: number
}

export default function EditorPage() {
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [intro, setIntro] = useState('')
  const [services, setServices] = useState<Service[]>([{ name: '', price: 0 }])
  const [saving, setSaving] = useState(false)

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
    const { data: { user } } = await supabase.auth.getUser()
    const blocks = [
      { type: 'intro', content: intro },
      { type: 'services', content: services },
    ]
    const { error } = await supabase
      .from('proposals')
      .insert({
        user_id: user?.id,
        title,
        client_name: clientName,
        client_email: clientEmail,
        blocks,
        total_amount: total,
        status: 'draft',
      })
    if (!error) window.location.href = '/dashboard'
    setSaving(false)
  }

  const input = {
    width: '100%',
    background: '#fafafa',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#0f0f0f',
    outline: 'none',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'sans-serif' }}>

      {/* Topbar */}
      <div style={{ background: '#0f0f0f', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a8e063' }} />
          <span style={{ color: '#ffffff', fontSize: '15px', letterSpacing: '-0.3px' }}>Proposly</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title}
            style={{ background: '#ffffff', color: '#0f0f0f', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: saving || !title ? 0.5 : 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar propuesta'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Título página */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
            Nueva propuesta
          </h1>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
            Completa los datos y envíala como link a tu cliente
          </p>
        </div>

        {/* Bloque 1: Datos */}
        <div style={{ background: '#ffffff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Datos de la propuesta
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              style={input}
              type="text"
              placeholder="Título de la propuesta"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <input
              style={input}
              type="text"
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
            />
            <input
              style={input}
              type="email"
              placeholder="Email del cliente"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Bloque 2: Introducción */}
        <div style={{ background: '#ffffff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Introducción
          </p>
          <textarea
            style={{ ...input, resize: 'none', lineHeight: '1.6' }}
            placeholder="Escribe una introducción personalizada para tu cliente..."
            value={intro}
            onChange={e => setIntro(e.target.value)}
            rows={4}
          />
        </div>

        {/* Bloque 3: Servicios */}
        <div style={{ background: '#ffffff', border: '1px solid #eee', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '11px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px' }}>
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
                  style={{ ...input, width: '110px', flex: 'none' }}
                  type="number"
                  placeholder="Precio"
                  value={service.price || ''}
                  onChange={e => updateService(index, 'price', e.target.value)}
                />
                <button
                  onClick={() => removeService(index)}
                  style={{ background: 'transparent', border: 'none', color: '#ccc', fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addService}
            style={{ width: '100%', background: 'transparent', border: '1px dashed #ddd', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#999', cursor: 'pointer' }}
          >
            + Añadir servicio
          </button>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: '13px', color: '#999' }}>Total sin IVA</span>
            <span style={{ fontSize: '22px', fontWeight: '400', color: '#0f0f0f', fontFamily: 'Georgia, serif' }}>
              {total.toLocaleString('es-ES')}€
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}