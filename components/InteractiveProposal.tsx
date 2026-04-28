'use client'

import { useState } from 'react'
import type { Block, Service } from '@/components/BlockEditor'
import AcceptButton from './AcceptButton'

interface Props {
  initialBlocks: Block[]
  proposalId: string
  signed: boolean
}

export default function InteractiveProposal({ initialBlocks, proposalId, signed }: Props) {
  // Inicializar estado de selección. Los no opcionales siempre están seleccionados.
  // Los opcionales empiezan deseleccionados por defecto a menos que ya vengan en true.
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
    if (signed) return // Si está firmada no se puede cambiar
    const newBlocks = [...blocks]
    const block = newBlocks[blockIndex]
    if (block.type === 'services') {
      const svc = block.content[serviceIndex]
      if (!svc.optional) return // No se puede deseleccionar si no es opcional
      block.content[serviceIndex] = { ...svc, selected: !svc.selected }
      setBlocks(newBlocks)
    }
  }

  // Calcular el total dinámico basado en lo seleccionado
  const calculateTotal = () => {
    return blocks
      .filter(b => b.type === 'services')
      .flatMap(b => (b as Extract<Block, { type: 'services' }>).content)
      .filter(s => s.selected !== false)
      .reduce((sum, s) => sum + Number(s.price), 0)
  }

  const currentTotal = calculateTotal()

  return (
    <div className="proposal-content" style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>
      {blocks.map((block: Block, i: number) => {
        if (block.type === 'header') {
          return (
            <h2 key={i} style={{ fontSize: '22px', fontWeight: '400', color: '#0F172A', margin: '32px 0 16px', letterSpacing: '-0.3px' }}>
              {block.content}
            </h2>
          )
        }
        if (block.type === 'text' || (block as Record<string, unknown>).type === 'intro') {
          return (
            <p key={i} style={{ fontSize: '16px', color: '#334155', lineHeight: '1.8', margin: '0 0 20px', fontStyle: 'italic' }}>
              {(block as Record<string, unknown>).content as string}
            </p>
          )
        }
        if (block.type === 'image') {
          return (
            <div key={i} style={{ margin: '24px 0' }}>
              <img src={block.url} alt={block.caption} style={{ width: '100%', borderRadius: '10px', display: 'block' }} />
              {block.caption && (
                <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '8px 0 0', fontFamily: 'sans-serif', fontStyle: 'normal' }}>
                  {block.caption}
                </p>
              )}
            </div>
          )
        }
        if (block.type === 'separator') {
          return <div key={i} style={{ height: '1px', background: '#E2E8F0', margin: '32px 0' }} />
        }
        if (block.type === 'services') {
          const svcSelectedTotal = block.content
            .filter((s: Service) => s.selected !== false)
            .reduce((sum, s) => sum + Number(s.price), 0)

          return (
            <div key={i} style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '20px' }}>
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
                      borderBottom: '1px solid #E2E8F0',
                      cursor: service.optional && !signed ? 'pointer' : 'default',
                      background: service.optional && !signed ? (isSelected ? 'rgba(67, 97, 238, 0.04)' : 'transparent') : 'transparent',
                      borderRadius: '8px',
                      transition: 'background 0.2s',
                      opacity: isSelected ? 1 : 0.5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {service.optional && (
                        <div style={{ 
                          width: '20px', height: '20px', borderRadius: '4px', 
                          border: `2px solid ${isSelected ? '#4361EE' : '#CBD5E1'}`,
                          background: isSelected ? '#4361EE' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: '15px', color: '#1E293B', fontFamily: 'sans-serif', textDecoration: isSelected ? 'none' : 'line-through' }}>
                          {service.name}
                        </span>
                        {service.optional && <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>Opcional</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '15px', color: '#1E293B', fontWeight: '500', fontFamily: 'sans-serif' }}>
                      {Number(service.price).toLocaleString('es-ES')}€
                    </span>
                  </div>
                )
              })}
              <div className="proposal-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#1C2B5E', borderRadius: '12px', marginTop: '20px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>Subtotal de sección</span>
                <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '400', letterSpacing: '-0.5px' }}>
                  {svcSelectedTotal.toLocaleString('es-ES')}€
                </span>
              </div>
            </div>
          )
        }
        return null
      })}

      {currentTotal > 0 && blocks.filter(b => b.type === 'services').length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#0F172A', borderRadius: '12px', margin: '8px 0 32px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>Total global sin IVA</span>
          <span style={{ color: '#ffffff', fontSize: '26px', fontWeight: '400', letterSpacing: '-0.5px' }}>
            {currentTotal.toLocaleString('es-ES')}€
          </span>
        </div>
      )}

      <div style={{ height: '1px', background: '#E2E8F0', margin: '32px 0' }} />

      <AcceptButton 
        proposalId={proposalId} 
        signed={signed} 
        finalTotal={currentTotal} 
        finalBlocks={blocks} 
      />
    </div>
  )
}
