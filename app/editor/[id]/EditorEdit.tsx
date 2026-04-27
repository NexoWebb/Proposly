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
  const [loading,     setLoading]     = useState(true)

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

  const canSave = !!title && !saving

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '14px', fontFamily: 'sans-serif' }}>
        Cargando propuesta...
      </div>
    )
  }

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
