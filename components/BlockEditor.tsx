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
    case 'header':    return { id, type: 'header', content: '' }
    case 'text':      return { id, type: 'text', content: '' }
    case 'image':     return { id, type: 'image', url: '', caption: '' }
    case 'separator': return { id, type: 'separator' }
    case 'services':  return { id, type: 'services', content: [{ name: '', price: 0, optional: false, selected: true }] }
    case 'timeline':  return { id, type: 'timeline', title: 'Fases del proyecto', items: [{ id: crypto.randomUUID(), title: '', description: '', duration: '' }] }
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

const TYPES: { type: Block['type']; label: string }[] = [
  { type: 'header',    label: 'Cabecera' },
  { type: 'text',      label: 'Texto' },
  { type: 'image',     label: 'Imagen' },
  { type: 'separator', label: 'Separador' },
  { type: 'services',  label: 'Servicios' },
  { type: 'timeline',  label: 'Timeline' },
]

const DOT: Record<Block['type'], string> = {
  header: '#4F6EF7', text: '#639922', image: '#BA7517',
  separator: '#888780', services: '#378ADD', timeline: '#9B6DD8',
}

const LABEL: Record<Block['type'], string> = {
  header: 'Cabecera', text: 'Texto', image: 'Imagen',
  separator: 'Separador', services: 'Servicios', timeline: 'Timeline',
}

export default function BlockEditor({ blocks, onChange, userId }: Props) {
  const [openAdd, setOpenAdd]    = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const pending  = useRef<{ blockId: string; index: number } | null>(null)

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

  /* ── Design tokens (CSS vars for dark mode support) ── */
  const card    = 'var(--bg-card)'
  const surface = 'var(--bg-surface)'
  const border  = 'var(--border)'
  const ink     = 'var(--text-primary)'
  const mid     = 'var(--text-secondary)'

  const fieldInput: React.CSSProperties = {
    background: surface, border: `0.5px solid ${border}`, borderRadius: '6px',
    padding: '8px 12px', fontSize: '13px', color: ink,
    outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  const iconBtn = (disabled = false, danger = false): React.CSSProperties => ({
    background: 'none',
    border: `0.5px solid ${danger ? 'rgba(162,45,45,0.3)' : border}`,
    borderRadius: '4px', width: '24px', height: '24px',
    cursor: disabled ? 'default' : 'pointer',
    color: danger ? '#A32D2D' : mid,
    fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, opacity: disabled ? 0.35 : 1,
  })

  /* ── Sub-components ── */
  const Actions = ({ i }: { i: number }) => (
    <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
      <button style={iconBtn(i === 0)}                 onClick={() => swap(i - 1, i)} disabled={i === 0}>↑</button>
      <button style={iconBtn(i === blocks.length - 1)} onClick={() => swap(i, i + 1)} disabled={i === blocks.length - 1}>↓</button>
      <button style={iconBtn(false, true)}             onClick={() => remove(i)}>×</button>
    </div>
  )

  const BlockHeader = ({ type, i }: { type: Block['type']; i: number }) => (
    <div style={{ background: surface, borderBottom: `0.5px solid ${border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: DOT[type], flexShrink: 0 }} />
      <span style={{ fontSize: '11px', color: mid, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500', flex: 1 }}>
        {LABEL[type]}
      </span>
      <Actions i={i} />
    </div>
  )

  const AddRow = ({ after }: { after: number }) => {
    const open = openAdd === after
    return open ? (
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '10px', padding: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', margin: '3px 0', position: 'relative', zIndex: 10 }}>
        {TYPES.map(t => (
          <button key={t.type} onClick={() => addAfter(after, t.type)}
            style={{ background: surface, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '54px', fontFamily: 'inherit' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: DOT[t.type] }} />
            <span style={{ fontSize: '10px', color: mid, whiteSpace: 'nowrap' }}>{LABEL[t.type]}</span>
          </button>
        ))}
        <button onClick={() => setOpenAdd(null)}
          style={{ background: 'none', border: 'none', color: mid, fontSize: '16px', cursor: 'pointer', alignSelf: 'center', padding: '0 4px' }}>×</button>
      </div>
    ) : (
      <button onClick={() => setOpenAdd(after)}
        style={{ width: '100%', background: 'none', border: `0.5px dashed ${border}`, borderRadius: '12px', padding: '12px', fontSize: '12px', color: mid, cursor: 'pointer', fontFamily: 'inherit', display: 'block', margin: '4px 0' }}>
        + Añadir bloque
      </button>
    )
  }

  /* ── Empty state ── */
  if (blocks.length === 0) {
    return (
      <div style={{ border: `1px dashed ${border}`, borderRadius: '12px', padding: '48px 24px', textAlign: 'center', background: surface }}>
        <p style={{ color: mid, fontSize: '13px', margin: '0 0 16px', fontFamily: 'inherit' }}>Añade tu primer bloque</p>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t.type} onClick={() => addAfter(-1, t.type)}
              style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: ink, fontFamily: 'inherit' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: DOT[t.type], flexShrink: 0 }} />
              {LABEL[t.type]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Block list ── */
  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {blocks.map((block, i) => (
        <div key={block.id}>

          {/* HEADER */}
          {block.type === 'header' && (
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
              <BlockHeader type="header" i={i} />
              <div style={{ padding: '14px 18px' }}>
                <input
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '18px', fontWeight: '500', color: ink, fontFamily: 'inherit', letterSpacing: '-0.3px', boxSizing: 'border-box' }}
                  placeholder="Título de sección..."
                  value={block.content}
                  onChange={e => update(i, { ...block, content: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* TEXT */}
          {block.type === 'text' && (
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
              <BlockHeader type="text" i={i} />
              <div style={{ padding: '14px 18px' }}>
                <textarea
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: ink, lineHeight: '1.7', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Escribe un párrafo..."
                  value={block.content}
                  onChange={e => update(i, { ...block, content: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* IMAGE */}
          {block.type === 'image' && (
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
              <BlockHeader type="image" i={i} />
              <div style={{ padding: '14px 18px' }}>
                {block.url
                  ? <img src={block.url} alt={block.caption} style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', display: 'block' }} />
                  : (
                    <div
                      onClick={() => !uploading && triggerUpload(block.id, i)}
                      style={{ border: `1px dashed ${border}`, borderRadius: '8px', padding: '32px', textAlign: 'center', cursor: 'pointer', color: mid, fontSize: '13px', marginBottom: '10px', background: surface }}
                    >
                      {uploading ? 'Subiendo...' : '↑  Subir imagen'}
                    </div>
                  )
                }
                {block.url && (
                  <button onClick={() => triggerUpload(block.id, i)}
                    style={{ ...fieldInput, width: 'auto', cursor: 'pointer', fontSize: '12px', marginBottom: '10px', display: 'inline-block', boxSizing: 'border-box' }}>
                    Cambiar imagen
                  </button>
                )}
                <input
                  style={fieldInput}
                  placeholder="Leyenda (opcional)..."
                  value={block.caption}
                  onChange={e => update(i, { ...block, caption: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* SEPARATOR */}
          {block.type === 'separator' && (
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
              <BlockHeader type="separator" i={i} />
              <div style={{ padding: '12px 18px' }}>
                <div style={{ height: '1px', background: border }} />
              </div>
            </div>
          )}

          {/* SERVICES */}
          {block.type === 'services' && (() => {
            const total = block.content.reduce((s, sv) => s + Number(sv.price), 0)
            const updateSvc = (si: number, field: keyof Service, val: string | boolean | number) => {
              const content = block.content.map((s, idx) => idx === si ? { ...s, [field]: val } : s)
              update(i, { ...block, content })
            }
            return (
              <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
                <BlockHeader type="services" i={i} />
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 70px 24px', gap: '6px', marginBottom: '8px', paddingBottom: '8px', borderBottom: `0.5px solid ${border}` }}>
                    {['Servicio', 'Precio', 'Opc.', ''].map(h => (
                      <span key={h} style={{ fontSize: '10px', color: mid, fontWeight: '500', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {block.content.map((svc, si) => (
                      <div key={si} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 70px 24px', gap: '6px', alignItems: 'center' }}>
                        <input style={fieldInput} placeholder="Nombre del servicio" value={svc.name} onChange={e => updateSvc(si, 'name', e.target.value)} />
                        <input style={fieldInput} type="number" placeholder="€" value={svc.price || ''} onChange={e => updateSvc(si, 'price', Number(e.target.value))} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: mid, cursor: 'pointer' }}>
                          <input type="checkbox" checked={svc.optional || false} onChange={e => updateSvc(si, 'optional', e.target.checked)} />
                          Op.
                        </label>
                        <button onClick={() => update(i, { ...block, content: block.content.filter((_, idx) => idx !== si) })}
                          style={{ background: 'none', border: 'none', color: mid, fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => update(i, { ...block, content: [...block.content, { name: '', price: 0, optional: false, selected: true }] })}
                    style={{ width: '100%', background: 'transparent', border: `1px dashed ${border}`, borderRadius: '6px', padding: '7px', fontSize: '12px', color: mid, cursor: 'pointer', marginBottom: '12px', fontFamily: 'inherit' }}
                  >+ Añadir línea</button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `0.5px solid ${border}`, paddingTop: '10px', gap: '20px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: mid }}>Total sin IVA</span>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: ink }}>{total.toLocaleString('es-ES')} €</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* TIMELINE */}
          {block.type === 'timeline' && (() => {
            const timelineOffset = blocks.slice(0, i).reduce((sum, b) => b.type === 'timeline' ? sum + (b as Extract<Block, {type:'timeline'}>).items.length : sum, 0)
            const updateItem = (ii: number, field: keyof TimelineItem, val: string) => {
              const items = block.items.map((item, idx) => idx === ii ? { ...item, [field]: val } : item)
              update(i, { ...block, items })
            }
            const swapItems = (a: number, b: number) => {
              const items = [...block.items]; [items[a], items[b]] = [items[b], items[a]]
              update(i, { ...block, items })
            }
            return (
              <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '4px' }}>
                <BlockHeader type="timeline" i={i} />
                <div style={{ padding: '14px 18px' }}>
                  <input
                    style={{ ...fieldInput, marginBottom: '16px', fontSize: '14px' }}
                    placeholder="Título del timeline (ej: Fases del proyecto)"
                    value={block.title}
                    onChange={e => update(i, { ...block, title: e.target.value })}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: '8px' }}>
                    {[...block.items.entries()].map(([stepIndex, item]) => (
                      <div key={item.id ?? stepIndex} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4F6EF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#fff', flexShrink: 0, marginTop: '8px' }}>
                            {timelineOffset + stepIndex + 1}
                          </div>
                          {stepIndex < block.items.length - 1 && (
                            <div style={{ width: '2px', flex: 1, background: border, margin: '4px 0' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, paddingBottom: stepIndex < block.items.length - 1 ? '12px' : 0 }}>
                          <div style={{ background: surface, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                              <input style={{ ...fieldInput, fontSize: '13px', fontWeight: '500' }} placeholder="Nombre de la fase" value={item.title} onChange={e => updateItem(stepIndex, 'title', e.target.value)} />
                              <input style={{ ...fieldInput, width: '90px', flexShrink: 0 }} placeholder="Duración" value={item.duration} onChange={e => updateItem(stepIndex, 'duration', e.target.value)} />
                              <button style={iconBtn(stepIndex === 0)} onClick={() => swapItems(stepIndex - 1, stepIndex)} disabled={stepIndex === 0}>↑</button>
                              <button style={iconBtn(stepIndex === block.items.length - 1)} onClick={() => swapItems(stepIndex, stepIndex + 1)} disabled={stepIndex === block.items.length - 1}>↓</button>
                              <button style={iconBtn(false, true)} onClick={() => update(i, { ...block, items: block.items.filter((_, idx) => idx !== stepIndex) })}>×</button>
                            </div>
                            <textarea style={{ ...fieldInput, resize: 'vertical', minHeight: '44px' }} placeholder="Descripción..." value={item.description} onChange={e => updateItem(stepIndex, 'description', e.target.value)} rows={2} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => update(i, { ...block, items: [...block.items, { id: crypto.randomUUID(), title: '', description: '', duration: '' }] })}
                    style={{ width: '100%', background: 'transparent', border: `1px dashed ${border}`, borderRadius: '6px', padding: '7px', fontSize: '12px', color: mid, cursor: 'pointer', fontFamily: 'inherit' }}
                  >+ Añadir fase</button>
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
