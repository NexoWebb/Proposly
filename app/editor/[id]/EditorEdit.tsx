'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BlockEditor, { Block, computeTotal, normalizeBlocks } from '@/components/BlockEditor'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0',
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
  color: '#0F172A', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
}

export default function EditorEdit({ id }: { id: string }) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '14px' }}>
        Cargando propuesta...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 40px 80px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>

      {/* Sidebar */}
      <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ marginBottom: '4px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Editar propuesta</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Modifica el contenido y guarda</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 4px' }}>Datos</p>
          <input style={inputStyle} placeholder="Título de la propuesta" value={title} onChange={e => setTitle(e.target.value)} />
          <input style={inputStyle} placeholder="Nombre del cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
          <input style={inputStyle} type="email" placeholder="Email del cliente" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
        </div>

        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', padding: '11px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!canSave}
          style={{ background: canSave ? '#4361EE' : '#C7D2FE', color: canSave ? '#fff' : '#818CF8', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: canSave ? 'pointer' : 'default' }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Canvas */}
      <div>
        <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px' }}>Contenido</p>
        <BlockEditor blocks={blocks} onChange={setBlocks} userId={userId ?? undefined} />
      </div>
    </div>
  )
}
