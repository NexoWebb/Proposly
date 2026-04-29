'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Service = { name: string; price: number; optional?: boolean; selected?: boolean }
export type TimelineItem = { id: string; title: string; description: string; duration: string }

export type Block =
  | { id: string; type: 'header'; content: string }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string; caption: string }
  | { id: string; type: 'separator' }
  | { id: string; type: 'services'; content: Service[] }
  | { id: string; type: 'timeline'; title: string; items: TimelineItem[] }

export function mkBlock(type: Block['type']): Block {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header':   return { id, type: 'header', content: '' }
    case 'text':     return { id, type: 'text', content: '' }
    case 'image':    return { id, type: 'image', url: '', caption: '' }
    case 'separator':return { id, type: 'separator' }
    case 'services': return { id, type: 'services', content: [{ name: '', price: 0, optional: false, selected: true }] }
    case 'timeline': return { id, type: 'timeline', title: 'Fases del proyecto', items: [{ id: crypto.randomUUID(), title: '', description: '', duration: '' }] }
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
  { type: 'header',    label: 'Encabezado', icon: 'H' },
  { type: 'text',      label: 'Texto',      icon: '¶' },
  { type: 'image',     label: 'Imagen',     icon: '🖼️' },
  { type: 'separator', label: 'Separador',  icon: '—' },
  { type: 'services',  label: 'Servicios',  icon: '€' },
  { type: 'timeline',  label: 'Timeline',   icon: '📅' },
]

export default function BlockEditor({ blocks, onChange, userId }: Props) {
  const [openAdd, setOpenAdd]   = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef   = useRef<HTMLInputElement>(null)
  const pending   = useRef<{ blockId: string; index: number } | null>(null)

  const setBlocks = (b: Block[]) => { onChange(b) }
  const update    = (i: number, block: Block) => { const b = [...blocks]; b[i] = block; setBlocks(b) }
  const remove    = (i: number) => setBlocks(blocks.filter((_, idx) => idx !== i))
  const swap      = (a: number, b: number) => {
    const arr = [...blocks]; [arr[a], arr[b]] = [arr[b], arr[a]]; setBlocks(arr)
  }
  const addAfter  = (after: number, type: Block['type']) => {
    const b = [...blocks]; b.splice(after + 1, 0, mkBlock(type)); setBlocks(b); setOpenAdd(null)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const p = pending.current
    if (!file || !p || !userId) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
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

  /* ── Shared styles ─────────────────────────── */
  const card: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e8e3dc',
    borderRadius: '12px',
    padding: '24px 28px',
  }

  const badge: React.CSSProperties = {
    fontSize: '10px', color: '#aaa', fontFamily: 'monospace',
    textTransform: 'uppercase', letterSpacing: '1.5px', flexShrink: 0, userSelect: 'none',
  }

  const iconBtn = (disabled = false, danger = false): React.CSSProperties => ({
    background: 'none',
    border: `1px solid ${danger ? '#fca5a5' : disabled ? '#f0ede8' : '#e8e3dc'}`,
    borderRadius: '6px', width: '28px', height: '28px',
    cursor: disabled ? 'default' : 'pointer',
    color: danger ? '#ef4444' : disabled ? '#d0ccc5' : '#888',
    fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })

  const fieldInput: React.CSSProperties = {
    background: '#f8f7f4', border: '1px solid #e8e3dc', borderRadius: '6px',
    padding: '8px 12px', fontSize: '14px', color: '#0f0f0f',
    outline: 'none', fontFamily: 'sans-serif',
  }

  /* ── Sub-components ────────────────────────── */
  const Actions = ({ i }: { i: number }) => (
    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
      <button style={iconBtn(i === 0)}                  onClick={() => swap(i - 1, i)} disabled={i === 0}>↑</button>
      <button style={iconBtn(i === blocks.length - 1)}  onClick={() => swap(i, i + 1)} disabled={i === blocks.length - 1}>↓</button>
      <button style={iconBtn(false, true)}              onClick={() => remove(i)}>×</button>
    </div>
  )

  const AddRow = ({ after }: { after: number }) => {
    const open = openAdd === after
    return (
      <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {open ? (
          <div style={{ display: 'flex', gap: '6px', background: '#fff', border: '1px solid #e8e3dc', borderRadius: '10px', padding: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', position: 'relative', zIndex: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TYPES.map(t => (
              <button key={t.type} onClick={() => addAfter(after, t.type)}
                style={{ background: '#f8f7f4', border: '1px solid #e8e3dc', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '52px' }}>
                <span style={{ fontSize: '16px' }}>{t.icon}</span>
                <span style={{ fontSize: '10px', color: '#888', whiteSpace: 'nowrap' }}>{t.label}</span>
              </button>
            ))}
            <button onClick={() => setOpenAdd(null)}
              style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '18px', cursor: 'pointer', alignSelf: 'center', padding: '0 4px' }}>×</button>
          </div>
        ) : (
          <button
            onClick={() => setOpenAdd(after)}
            style={{ background: '#fff', border: '1px solid #e8e3dc', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: '#ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#0f0f0f'; b.style.color = '#0f0f0f' }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e3dc'; b.style.color = '#ccc' }}
          >+</button>
        )}
      </div>
    )
  }

  /* ── Empty state ───────────────────────────── */
  if (blocks.length === 0) {
    return (
      <div style={{ border: '2px dashed #e8e3dc', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', background: '#faf9f7' }}>
        <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 20px', fontFamily: 'sans-serif' }}>Añade tu primer bloque</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t.type} onClick={() => addAfter(-1, t.type)}
              style={{ background: '#fff', border: '1px solid #e8e3dc', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555', fontFamily: 'sans-serif' }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Block list ────────────────────────────── */
  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {blocks.map((block, i) => (
        <div key={block.id}>

          {/* HEADER */}
          {block.type === 'header' && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badge}>H</span>
                <input
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '20px', fontWeight: '400', color: '#0f0f0f', fontFamily: 'Georgia, serif', letterSpacing: '-0.3px' }}
                  placeholder="Título de sección..."
                  value={block.content}
                  onChange={e => update(i, { ...block, content: e.target.value })}
                />
                <Actions i={i} />
              </div>
            </div>
          )}

          {/* TEXT */}
          {block.type === 'text' && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ ...badge, paddingTop: '3px' }}>¶</span>
                <textarea
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#333', lineHeight: '1.8', resize: 'vertical', minHeight: '80px', fontFamily: 'sans-serif' }}
                  placeholder="Escribe un párrafo..."
                  value={block.content}
                  onChange={e => update(i, { ...block, content: e.target.value })}
                  rows={4}
                />
                <Actions i={i} />
              </div>
            </div>
          )}

          {/* IMAGE */}
          {block.type === 'image' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={badge}>Imagen</span>
                <Actions i={i} />
              </div>
              {block.url
                ? <img src={block.url} alt={block.caption} style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', display: 'block' }} />
                : (
                  <div
                    onClick={() => !uploading && triggerUpload(block.id, i)}
                    style={{ border: '2px dashed #e8e3dc', borderRadius: '8px', padding: '36px', textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: '14px', marginBottom: '10px', background: '#faf9f7', fontFamily: 'sans-serif' }}
                  >
                    {uploading ? 'Subiendo...' : '🖼️  Haz clic para subir una imagen'}
                  </div>
                )
              }
              {block.url && (
                <button onClick={() => triggerUpload(block.id, i)}
                  style={{ ...fieldInput, cursor: 'pointer', padding: '5px 12px', fontSize: '12px', color: '#555', marginBottom: '10px', display: 'block' }}>
                  Cambiar imagen
                </button>
              )}
              <input
                style={{ ...fieldInput, width: '100%', boxSizing: 'border-box', color: '#888' }}
                placeholder="Leyenda (opcional)..."
                value={block.caption}
                onChange={e => update(i, { ...block, caption: e.target.value })}
              />
            </div>
          )}

          {/* SEPARATOR */}
          {block.type === 'separator' && (
            <div style={{ ...card, padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e8e3dc' }} />
                <span style={badge}>sep</span>
                <Actions i={i} />
              </div>
            </div>
          )}

          {/* SERVICES */}
          {block.type === 'services' && (() => {
            const total = block.content.reduce((s, sv) => s + Number(sv.price), 0)
            const updateSvc = (si: number, field: keyof Service, val: string | boolean | number) => {
              const content = block.content.map((s, idx) =>
                idx === si ? { ...s, [field]: val } : s
              )
              update(i, { ...block, content })
            }
            return (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={badge}>Servicios</span>
                  <Actions i={i} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {block.content.map((svc, si) => (
                    <div key={si} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        style={{ ...fieldInput, flex: 1 }}
                        placeholder="Nombre del servicio"
                        value={svc.name}
                        onChange={e => updateSvc(si, 'name', e.target.value)}
                      />
                      <input
                        style={{ ...fieldInput, width: '110px' }}
                        type="number" placeholder="€"
                        value={svc.price || ''}
                        onChange={e => updateSvc(si, 'price', Number(e.target.value))}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888', cursor: 'pointer', flexShrink: 0, width: '70px' }}>
                        <input type="checkbox" checked={svc.optional || false} onChange={e => updateSvc(si, 'optional', e.target.checked)} style={{ cursor: 'pointer' }} />
                        Opcional
                      </label>
                      <button
                        onClick={() => update(i, { ...block, content: block.content.filter((_, idx) => idx !== si) })}
                        style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '20px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
                      >×</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => update(i, { ...block, content: [...block.content, { name: '', price: 0, optional: false, selected: true }] })}
                  style={{ width: '100%', background: 'transparent', border: '1px dashed #e8e3dc', borderRadius: '6px', padding: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer', marginBottom: '14px', fontFamily: 'sans-serif' }}
                >+ Añadir línea</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0ede8', paddingTop: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#888', fontFamily: 'sans-serif' }}>Total sin IVA</span>
                  <span style={{ fontSize: '20px', color: '#0f0f0f', fontFamily: 'Georgia, serif' }}>{total.toLocaleString('es-ES')}€</span>
                </div>
              </div>
            )
          })()}

          {/* TIMELINE */}
          {block.type === 'timeline' && (() => {
            const updateItem = (ii: number, field: keyof TimelineItem, val: string) => {
              const items = block.items.map((item, idx) => idx === ii ? { ...item, [field]: val } : item)
              update(i, { ...block, items })
            }
            const swapItems = (a: number, b: number) => {
              const items = [...block.items]; [items[a], items[b]] = [items[b], items[a]]
              update(i, { ...block, items })
            }
            return (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={badge}>Timeline</span>
                  <Actions i={i} />
                </div>
                <input
                  style={{ ...fieldInput, width: '100%', boxSizing: 'border-box', marginBottom: '20px', fontSize: '15px' }}
                  placeholder="Título del timeline (ej: Fases del proyecto)"
                  value={block.title}
                  onChange={e => update(i, { ...block, title: e.target.value })}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '8px' }}>
                  {[...block.items.entries()].map(([stepIndex, item]) => (
                    <div key={item.id ?? stepIndex} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                      {/* Circle + line column */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: '#4A7FA5', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '13px', fontWeight: '600',
                          color: '#fff', flexShrink: 0, marginTop: '8px',
                        }}>
                          {stepIndex + 1}
                        </div>
                        {stepIndex < block.items.length - 1 && (
                          <div style={{ width: '2px', flex: 1, background: '#B8D4E8', margin: '4px 0' }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: stepIndex < block.items.length - 1 ? '14px' : 0 }}>
                        <div style={{ background: '#f8f7f4', border: '1px solid #e8e3dc', borderRadius: '8px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <input
                              style={{ ...fieldInput, flex: 1, fontSize: '15px', fontWeight: '500' }}
                              placeholder="Nombre de la fase"
                              value={item.title}
                              onChange={e => updateItem(stepIndex, 'title', e.target.value)}
                            />
                            <input
                              style={{ ...fieldInput, width: '100px', flexShrink: 0 }}
                              placeholder="Duración"
                              value={item.duration}
                              onChange={e => updateItem(stepIndex, 'duration', e.target.value)}
                            />
                            <button style={iconBtn(stepIndex === 0)} onClick={() => swapItems(stepIndex - 1, stepIndex)} disabled={stepIndex === 0}>↑</button>
                            <button style={iconBtn(stepIndex === block.items.length - 1)} onClick={() => swapItems(stepIndex, stepIndex + 1)} disabled={stepIndex === block.items.length - 1}>↓</button>
                            <button style={iconBtn(false, true)} onClick={() => update(i, { ...block, items: block.items.filter((_, idx) => idx !== stepIndex) })}>×</button>
                          </div>
                          <textarea
                            style={{ ...fieldInput, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '48px', color: '#888' }}
                            placeholder="Descripción opcional..."
                            value={item.description}
                            onChange={e => updateItem(stepIndex, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => update(i, { ...block, items: [...block.items, { id: crypto.randomUUID(), title: '', description: '', duration: '' }] })}
                  style={{ width: '100%', background: 'transparent', border: '1px dashed #e8e3dc', borderRadius: '6px', padding: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer', fontFamily: 'sans-serif' }}
                >+ Añadir fase</button>
              </div>
            )
          })()}

          <AddRow after={i} />
        </div>
      ))}
    </div>
  )
}
