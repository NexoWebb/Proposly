'use client'

import { useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { Block, Service, TimelineItem } from '@/components/BlockEditor'
import AcceptButton from './AcceptButton'

interface FiscalParty {
  fiscalName: string
  fiscalId: string
  fiscalAddress: string
  fiscalCity?: string
}

interface Props {
  initialBlocks: Block[]
  proposalId: string
  signed: boolean
  autoExport?: boolean
  vatRate?: string
  irpfEnabled?: boolean
  irpfRate?: string
  emisor?: FiscalParty | null
  cliente?: FiscalParty | null
  proposalTitle?: string
  clientName?: string
}

function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function InteractiveProposal({ initialBlocks, proposalId, signed, autoExport, vatRate = '21', irpfEnabled = false, irpfRate = '15', emisor = null, cliente = null, proposalTitle = '', clientName = '' }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    return initialBlocks.map(b => {
      if (b.type === 'services') {
        return {
          ...b,
          content: b.content.map((s: Service) => ({
            ...s,
            selected: s.optional ? (s.selected ?? false) : true
          }))
        }
      }
      return b
    })
  })

  const toggleService = (blockIndex: number, serviceIndex: number) => {
    if (signed) return
    const newBlocks = [...blocks]
    const block = newBlocks[blockIndex]
    if (block.type === 'services') {
      const svc = block.content[serviceIndex]
      if (!svc.optional) return
      block.content[serviceIndex] = { ...svc, selected: !svc.selected }
      setBlocks(newBlocks)
    }
  }

  const calculateTotal = () => {
    return blocks
      .filter(b => b.type === 'services')
      .flatMap(b => (b as Extract<Block, { type: 'services' }>).content)
      .filter(s => s.selected !== false)
      .reduce((sum, s) => sum + Number(s.price), 0)
  }

  const currentTotal = calculateTotal()

  const vatNum = ['21','10','4'].includes(vatRate) ? Number(vatRate) : 0
  const irpfNum = irpfEnabled ? Number(irpfRate) : 0
  const vatAmount = Math.round(currentTotal * vatNum) / 100
  const irpfAmount = Math.round(currentTotal * irpfNum) / 100
  const grandTotal = currentTotal + vatAmount - irpfAmount

  const fmtEur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
  const showFiscal = !!(emisor || cliente)

  const handleDownloadPDF = async () => {
    const element = document.getElementById('proposal-content')
    if (!element) return

    const originalWidth = element.style.width
    const originalMaxWidth = element.style.maxWidth
    element.style.width = '900px'
    element.style.maxWidth = '900px'

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#D6E8F5',
      width: 900,
      windowWidth: 900,
    })

    element.style.width = originalWidth
    element.style.maxWidth = originalMaxWidth

    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
    const titleSlug = slugify(proposalTitle) || proposalId
    const clientSlug = slugify(clientName) || 'cliente'
    pdf.save(`Propuesta-${titleSlug}-${clientSlug}.pdf`)
  }

  useEffect(() => {
    if (!autoExport) return
    handleDownloadPDF()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExport])

  return (
    <div className="proposal-content" style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>
      {blocks.map((block: Block, i: number) => {
        if (block.type === 'header') {
          return (
            <h2 key={i} style={{ fontSize: '22px', fontWeight: '400', color: '#0F2A3D', margin: '32px 0 16px', letterSpacing: '-0.3px' }}>
              {block.content}
            </h2>
          )
        }
        if (block.type === 'text' || (block as Record<string, unknown>).type === 'intro') {
          return (
            <p key={i} style={{ fontSize: '16px', color: '#5A7A8F', lineHeight: '1.8', margin: '0 0 20px', fontStyle: 'italic' }}>
              {(block as Record<string, unknown>).content as string}
            </p>
          )
        }
        if (block.type === 'image') {
          return (
            <div key={i} style={{ margin: '24px 0' }}>
              <img src={block.url} alt={block.caption} style={{ width: '100%', borderRadius: '10px', display: 'block' }} />
              {block.caption && (
                <p style={{ fontSize: '12px', color: '#5A7A8F', textAlign: 'center', margin: '8px 0 0', fontFamily: 'sans-serif', fontStyle: 'normal' }}>
                  {block.caption}
                </p>
              )}
            </div>
          )
        }
        if (block.type === 'separator') {
          return <div key={i} style={{ height: '1px', background: '#B8D4E8', margin: '32px 0' }} />
        }
        if (block.type === 'services') {
          const svcSelectedTotal = block.content
            .filter((s: Service) => s.selected !== false)
            .reduce((sum, s) => sum + Number(s.price), 0)

          return (
            <div key={i} style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', color: '#5A7A8F', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '20px' }}>
                Servicios incluidos
              </p>
              {block.content.map((service: Service, si: number) => {
                const isSelected = service.selected !== false
                return (
                  <div key={si}
                    onClick={() => toggleService(i, si)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 12px',
                      borderBottom: '1px solid #B8D4E8',
                      cursor: service.optional && !signed ? 'pointer' : 'default',
                      background: service.optional && !signed ? (isSelected ? 'rgba(74, 127, 165, 0.06)' : 'transparent') : 'transparent',
                      borderRadius: '8px',
                      transition: 'background 0.2s',
                      opacity: isSelected ? 1 : 0.5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {service.optional && !signed && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '4px',
                            border: `2px solid ${isSelected ? '#4A7FA5' : '#B8D4E8'}`,
                            background: isSelected ? '#4A7FA5' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                          </div>
                          <span style={{ fontSize: '9px', color: '#5A7A8F', fontFamily: 'sans-serif', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>Añadir</span>
                        </div>
                      )}
                      {service.optional && signed && (
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '4px',
                          border: `2px solid ${isSelected ? '#4A7FA5' : '#B8D4E8'}`,
                          background: isSelected ? '#4A7FA5' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: '15px', color: '#0F2A3D', fontFamily: 'sans-serif', textDecoration: isSelected ? 'none' : 'line-through' }}>
                          {service.name}
                        </span>
                        {service.optional && <span style={{ fontSize: '11px', color: '#5A7A8F', marginLeft: '8px', background: '#EAF4FB', padding: '2px 6px', borderRadius: '4px' }}>Opcional</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '15px', color: '#0F2A3D', fontWeight: '500', fontFamily: 'sans-serif' }}>
                      {Number(service.price).toLocaleString('es-ES')}€
                    </span>
                  </div>
                )
              })}
              <div className="proposal-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#4A7FA5', borderRadius: '12px', marginTop: '20px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontFamily: 'sans-serif' }}>Subtotal de sección</span>
                <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '400', letterSpacing: '-0.5px' }}>
                  {svcSelectedTotal.toLocaleString('es-ES')}€
                </span>
              </div>
            </div>
          )
        }
        if (block.type === 'timeline') {
          const tl = block as Extract<Block, { type: 'timeline' }>
          return (
            <div key={i} style={{ margin: '32px 0' }}>
              {tl.title && (
                <p style={{ fontSize: '11px', color: '#5A7A8F', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '28px' }}>
                  {tl.title}
                </p>
              )}
              <div style={{ position: 'relative', paddingLeft: '48px' }}>
                {tl.items.length > 1 && (
                  <div style={{ position: 'absolute', left: '15px', top: '22px', bottom: '22px', width: '2px', background: '#B8D4E8' }} />
                )}
                {tl.items.map((item: TimelineItem, ti: number) => (
                  <div key={item.id ?? ti} style={{ position: 'relative', marginBottom: ti < tl.items.length - 1 ? '20px' : 0 }}>
                    <div style={{
                      position: 'absolute', left: '-48px', top: '8px',
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: '#4A7FA5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700', color: '#fff', zIndex: 1,
                    }}>
                      {ti + 1}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid #B8D4E8', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: item.description ? '6px' : 0 }}>
                        <span style={{ fontSize: '15px', color: '#0F2A3D', fontFamily: 'sans-serif', fontWeight: '700' }}>{item.title}</span>
                        {item.duration && (
                          <span style={{ fontSize: '11px', color: '#4A7FA5', background: '#EAF4FB', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {item.duration}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p style={{ fontSize: '13px', color: '#5A7A8F', margin: 0, lineHeight: '1.6', fontFamily: 'sans-serif', fontStyle: 'normal' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        return null
      })}

      {/* Desglose económico final */}
      {currentTotal > 0 && (
        <div style={{ background: '#0F2A3D', borderRadius: '12px', margin: '8px 0 32px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>Subtotal</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontFamily: 'sans-serif', fontVariantNumeric: 'tabular-nums' }}>{fmtEur(currentTotal)}</span>
          </div>

          {vatRate === 'exempt' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>IVA (Exento)</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>0,00 €</span>
            </div>
          ) : vatRate === 'isp' ? (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>IVA: Inversión sujeto pasivo</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>—</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'sans-serif', margin: '3px 0 0', fontStyle: 'italic' }}>
                El cliente declarará el IVA conforme al art. 84 LIVA
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>IVA ({vatRate}%)</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontFamily: 'sans-serif', fontVariantNumeric: 'tabular-nums' }}>{fmtEur(vatAmount)}</span>
            </div>
          )}

          {irpfEnabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>IRPF (-{irpfRate}%)</span>
              <span style={{ color: '#FCA5A5', fontSize: '14px', fontFamily: 'sans-serif', fontVariantNumeric: 'tabular-nums' }}>-{fmtEur(irpfAmount)}</span>
            </div>
          )}

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontFamily: 'sans-serif' }}>Total</span>
            <span style={{ color: '#ffffff', fontSize: '26px', fontWeight: '400', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
              {fmtEur(grandTotal)}
            </span>
          </div>
        </div>
      )}

      <div style={{ height: '1px', background: '#B8D4E8', margin: '32px 0' }} />

      {/* Bloque fiscal (incluido en PDF) */}
      {showFiscal && (
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #B8D4E8', borderRadius: '12px', padding: '20px 24px', margin: '0 0 32px', fontFamily: 'sans-serif' }}>
          <p style={{ fontSize: '10px', color: '#5A7A8F', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 16px' }}>Partes de la operación</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {emisor && (
              <div>
                <p style={{ fontSize: '10px', color: '#5A7A8F', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: '700' }}>Emisor</p>
                {emisor.fiscalName && <p style={{ fontSize: '13px', color: '#0F2A3D', margin: '0 0 3px', fontWeight: '600' }}>{emisor.fiscalName}</p>}
                {emisor.fiscalId && <p style={{ fontSize: '12px', color: '#5A7A8F', margin: '0 0 3px' }}>NIF/CIF: {emisor.fiscalId}</p>}
                {emisor.fiscalAddress && <p style={{ fontSize: '12px', color: '#5A7A8F', margin: '0 0 3px' }}>{emisor.fiscalAddress}</p>}
                {emisor.fiscalCity && <p style={{ fontSize: '12px', color: '#5A7A8F', margin: 0 }}>{emisor.fiscalCity}</p>}
              </div>
            )}
            {cliente && (
              <div>
                <p style={{ fontSize: '10px', color: '#5A7A8F', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: '700' }}>Cliente</p>
                {cliente.fiscalName && <p style={{ fontSize: '13px', color: '#0F2A3D', margin: '0 0 3px', fontWeight: '600' }}>{cliente.fiscalName}</p>}
                {cliente.fiscalId && <p style={{ fontSize: '12px', color: '#5A7A8F', margin: '0 0 3px' }}>NIF/CIF: {cliente.fiscalId}</p>}
                {cliente.fiscalAddress && <p style={{ fontSize: '12px', color: '#5A7A8F', margin: 0 }}>{cliente.fiscalAddress}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acciones excluidas del PDF */}
      <div data-html2canvas-ignore="true" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              background: 'transparent',
              border: '1px solid #B8D4E8',
              borderRadius: '20px',
              padding: '8px 18px',
              fontSize: '13px',
              color: '#4A7FA5',
              cursor: 'pointer',
              fontFamily: 'sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⬇ Descargar PDF
          </button>
        </div>

        <AcceptButton
          proposalId={proposalId}
          signed={signed}
          finalTotal={currentTotal}
          finalBlocks={blocks}
        />
      </div>
    </div>
  )
}
