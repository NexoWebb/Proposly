'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'
import BlockEditor, { Block, computeTotal, normalizeBlocks } from '@/components/BlockEditor'

const inp: React.CSSProperties = {
  width: '100%', background: '#f5f4f0', border: '1px solid #e8e3dc',
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
  color: '#0f0f0f', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
}

export default function EditorEdit({ id }: { id: string }) {
  const router   = useRouter()
  const isMobile = useIsMobile()

  const [userId,      setUserId]      = useState<string | null>(null)
  const [title,       setTitle]       = useState('')
  const [clientName,  setClientName]  = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [blocks,      setBlocks]      = useState<Block[]>([])
  const [saving,      setSaving]      = useState(false)
  const [sending,     setSending]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [status,      setStatus]      = useState<string>('draft')
  const [showSendModal, setShowSendModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')

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
    }).eq('id', id)
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, message: customMessage.trim() || undefined }) })
    const json = await res.json()
    if (!res.ok) {
      setSending(false)
      alert('Error al enviar: ' + (json.error ?? 'Error desconocido'))
      return
    }
    if (json.statusError) {
      alert('Email enviado pero fallo al actualizar estado: ' + json.statusError)
    }
    router.push('/dashboard')
  }

  const canSave = !!title && !saving && !sending
  const canSend = !!title && !!clientEmail && !saving && !sending && status === 'draft'

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '14px', fontFamily: 'sans-serif' }}>
        Cargando propuesta...
      </div>
    )
  }

  return (
    <>
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,42,61,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', border: '1px solid #e8e3dc', boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#0f0f0f', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Pasar a enviada</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 18px', fontFamily: 'sans-serif' }}>Se enviará un email a <strong>{clientEmail}</strong></p>
            <p style={{ fontSize: '11px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: 'sans-serif' }}>Mensaje personalizado (opcional)</p>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
              placeholder="Hola, te adjunto la propuesta que comentamos..."
              rows={4}
              style={{ width: '100%', background: '#f5f4f0', border: '1px solid #e8e3dc', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#0f0f0f', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => { setShowSendModal(false); setCustomMessage('') }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #e8e3dc', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending}
                style={{ flex: 1, background: sending ? '#C8E0D4' : '#4A9B6F', color: sending ? '#8FBFAB' : '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '500', cursor: sending ? 'default' : 'pointer', fontFamily: 'sans-serif' }}>
                {sending ? 'Enviando...' : 'Enviar ✉️'}
              </button>
            </div>
          </div>
        </div>
      )}
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
        <div style={{ marginBottom: '4px' }}>
          <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 4px', letterSpacing: '-0.4px', fontFamily: 'Georgia, serif' }}>
            Editar propuesta
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: 0, fontFamily: 'sans-serif' }}>
            Modifica el contenido y guarda
          </p>
        </div>

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
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {status === 'draft' && (
          <button onClick={() => setShowSendModal(true)} disabled={!canSend}
            style={{ background: canSend ? '#4A9B6F' : '#C8E0D4', color: canSend ? '#fff' : '#8FBFAB', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: canSend ? 'pointer' : 'default', fontFamily: 'sans-serif', transition: 'background 0.15s', boxShadow: canSend ? '0 4px 12px rgba(74,155,111,0.25)' : 'none' }}>
            {sending ? 'Enviando...' : 'Pasar a enviada →'}
          </button>
        )}
      </div>

      {/* ── Canvas ── */}
      <div>
        <p style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 14px', fontFamily: 'sans-serif' }}>
          Contenido
        </p>
        <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
      </div>

    </div>
    </>
  )
}
