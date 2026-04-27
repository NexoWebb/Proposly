'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Service = { name: string; price: number }

export type Block =
  | { id: string; type: 'header'; content: string }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string; caption: string }
  | { id: string; type: 'separator' }
  | { id: string; type: 'services'; content: Service[] }

export function mkBlock(type: Block['type']): Block {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header': return { id, type: 'header', content: '' }
    case 'text': return { id, type: 'text', content: '' }
    case 'image': return { id, type: 'image', url: '', caption: '' }
    case 'separator': return { id, type: 'separator' }
    case 'services': return { id, type: 'services', content: [{ name: '', price: 0 }] }
  }
}

export function normalizeBlocks(raw: Record<string, unknown>[]): Block[] {
  return (raw ?? []).map(b => ({
    id: (b.id as string) ?? crypto.randomUUID(),
    ...(b.type === 'intro' ? { ...b, type: 'text' } : b),
  })) as Block[]
}

export function computeTotal(blocks: Block[]): number {
  return blocks
    .filter(b => b.type === 'services')
    .flatMap(b => (b as Extract<Block, { type: 'services' }>).content)
    .reduce((sum, s) => sum + Number(s.price), 0)
}

interface Props {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  userId?: string
}

const TYPES: { type: Block['type']; label: string; icon: string }[] = [
  { type: 'header', label: 'Encabezado', icon: 'H' },
  { type: 'text', label: 'Texto', icon: '¶' },
  { type: 'image', label: 'Imagen', icon: '🖼️' },
  { type: 'separator', label: 'Separador', icon: '—' },
  { type: 'services', label: 'Servicios', icon: '€' },
]

export default function BlockEditor({ blocks, onChange, userId }: Props) {
  const [openAdd, setOpenAdd] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pending = useRef<{ blockId: string; index: number } | null>(null)

  const update = (i: number, block: Block) => {
    const b = [...blocks]; b[i] = block; onChange(b)
  }
  const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i))
  const swap = (a: number, b: number) => {
    const arr = [...blocks]; [arr[a], arr[b]] = [arr[b], arr[a]]; onChange(arr)
  }
  const addAfter = (after: number, type: Block['type']) => {
    const b = [...blocks]; b.splice(after + 1, 0, mkBlock(type)); onChange(b); setOpenAdd(null)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const p = pending.current
    if (!file || !p || !userId) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${p.blockId}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (error) { alert('Error al subir imagen: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    const block = blocks[p.index]
    if (block.type === 'image') update(p.index, { ...block, url: data.publicUrl })
    setUploading(false)
    e.target.value = ''
  }

  const triggerUpload = (blockId: string, index: number) => {
    pending.current = { blockId, index }
    fileRef.current?.click()
  }

  const wrap: React.CSSProperties = {
    background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 20px',
  }
  const badge: React.CSSProperties = {
    fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace',
    textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0,
  }
  const iBtn = (disabled = false, danger = false): React.CSSProperties => ({
    background: 'none',
    border: `1px solid ${danger ? '#FCA5A5' : disabled ? '#F1F5F9' : '#E2E8F0'}`,
    borderRadius: '6px', width: '28px', height: '28px', cursor: disabled ? 'default' : 'pointer',
    color: danger ? '#EF4444' : disabled ? '#E2E8F0' : '#94A3B8',
    fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })

  const Actions = ({ i }: { i: number }) => (
    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
      <button style={iBtn(i === 0)} onClick={() => swap(i - 1, i)} disabled={i === 0}>↑</button>
      <button style={iBtn(i === blocks.length - 1)} onClick={() => swap(i, i + 1)} disabled={i === blocks.length - 1}>↓</button>
      <button style={iBtn(false, true)} onClick={() => remove(i)}>×</button>
    </div>
  )

  const AddRow = ({ after }: { after: number }) => {
    const open = openAdd === after
    return (
      <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {open ? (
          <div style={{ display: 'flex', gap: '6px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, position: 'relative' }}>
            {TYPES.map(t => (
              <button key={t.type} onClick={() => addAfter(after, t.type)}
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '54px' }}>
                <span style={{ fontSize: '16px' }}>{t.icon}</span>
                <span style={{ fontSize: '10px', color: '#64748B', whiteSpace: 'nowrap' }}>{t.label}</span>
              </button>
            ))}
            <button onClick={() => setOpenAdd(null)} style={{ background: 'none', border: 'none', color: '#CBD5E1', fontSize: '18px', cursor: 'pointer', alignSelf: 'center', padding: '0 4px' }}>×</button>
          </div>
        ) : (
          <button
            onClick={() => setOpenAdd(after)}
            style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: '#CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#4361EE'; (e.currentTarget as HTMLButtonElement).style.color = '#4361EE' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLButtonElement).style.color = '#CBD5E1' }}
          >+</button>
        )}
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div style={{ border: '2px dashed #E2E8F0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '20px', margin: '0 0 20px' }}>Añade tu primer bloque</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t.type} onClick={() => addAfter(-1, t.type)}
              style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {blocks.map((block, i) => (
        <div key={block.id}>
          {block.type === 'header' && (
            <div style={wrap}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badge}>H</span>
                <input
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '20px', fontWeight: '600', color: '#0F172A', fontFamily: 'Georgia, serif' }}
                  placeholder="Título de sección..."
                  value={block.content}
                  onChange={e => update(i, { ...block, content: e.target.value })}
                />
                <Actions i={i} />
              </div>
            </div>
          )}

          {block.type === 'text' && (
            <div style={wrap}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ ...badge, paddingTop: '3px' }}>¶</span>
                <textarea
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#334155', lineHeight: '1.8', resize: 'vertical', minHeight: '80px', fontFamily: 'sans-serif' }}
                  placeholder="Escribe un párrafo..."
                  value={block.content}
                  onChange={e => update(i, { ...block, content: e.target.value })}
                  rows={4}
                />
                <Actions i={i} />
              </div>
            </div>
          )}

          {block.type === 'image' && (
            <div style={wrap}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={badge}>Imagen</span>
                <Actions i={i} />
              </div>
              {block.url ? (
                <img src={block.url} alt={block.caption} style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', display: 'block' }} />
              ) : (
                <div
                  onClick={() => !uploading && triggerUpload(block.id, i)}
                  style={{ border: '2px dashed #CBD5E1', borderRadius: '8px', padding: '36px', textAlign: 'center', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', marginBottom: '10px' }}
                >
                  {uploading ? 'Subiendo...' : '🖼️  Haz clic para subir una imagen'}
                </div>
              )}
              {block.url && (
                <button onClick={() => triggerUpload(block.id, i)}
                  style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#64748B', cursor: 'pointer', marginBottom: '10px', display: 'block' }}>
                  Cambiar imagen
                </button>
              )}
              <input
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', color: '#64748B', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box' }}
                placeholder="Leyenda (opcional)..."
                value={block.caption}
                onChange={e => update(i, { ...block, caption: e.target.value })}
              />
            </div>
          )}

          {block.type === 'separator' && (
            <div style={{ ...wrap, padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                <span style={badge}>sep</span>
                <Actions i={i} />
              </div>
            </div>
          )}

          {block.type === 'services' && (() => {
            const total = block.content.reduce((s, sv) => s + Number(sv.price), 0)
            const updateSvc = (si: number, field: keyof Service, val: string) => {
              const content = block.content.map((s, idx) =>
                idx === si ? { ...s, [field]: field === 'price' ? Number(val) : val } : s
              )
              update(i, { ...block, content })
            }
            return (
              <div style={wrap}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={badge}>Servicios</span>
                  <Actions i={i} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {block.content.map((svc, si) => (
                    <div key={si} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', color: '#0F172A', outline: 'none', fontFamily: 'sans-serif' }}
                        placeholder="Nombre del servicio"
                        value={svc.name}
                        onChange={e => updateSvc(si, 'name', e.target.value)}
                      />
                      <input
                        style={{ width: '110px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', color: '#0F172A', outline: 'none', fontFamily: 'sans-serif' }}
                        type="number" placeholder="€"
                        value={svc.price || ''}
                        onChange={e => updateSvc(si, 'price', e.target.value)}
                      />
                      <button
                        onClick={() => update(i, { ...block, content: block.content.filter((_, idx) => idx !== si) })}
                        style={{ background: 'none', border: 'none', color: '#CBD5E1', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => update(i, { ...block, content: [...block.content, { name: '', price: 0 }] })}
                  style={{ width: '100%', background: 'transparent', border: '1px dashed #CBD5E1', borderRadius: '6px', padding: '8px', fontSize: '13px', color: '#94A3B8', cursor: 'pointer', marginBottom: '14px' }}
                >+ Añadir línea</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Total sin IVA</span>
                  <span style={{ fontSize: '20px', color: '#0F172A', fontFamily: 'Georgia, serif' }}>{total.toLocaleString('es-ES')}€</span>
                </div>
              </div>
            )
          })()}

          <AddRow after={i} />
        </div>
      ))}
    </div>
  )
}
