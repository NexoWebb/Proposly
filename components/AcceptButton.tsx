'use client'

import { useState } from 'react'
import { Block } from '@/components/BlockEditor'
import { useIsMobile } from '@/lib/useIsMobile'

const primary = '#4F6EF7'

export default function AcceptButton({
  proposalId, signed, expired = false, finalTotal, finalBlocks,
}: {
  proposalId: string
  signed: boolean
  expired?: boolean
  finalTotal?: number
  finalBlocks?: Block[]
}) {
  const [step, setStep] = useState<'idle' | 'form' | 'done'>('idle')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const isMobile = useIsMobile()
  const isSticky = isMobile && step === 'idle' && !expired

  const handleAccept = async () => {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: proposalId, signerName: name, finalTotal, finalBlocks }),
    })
    if (!res.ok) {
      setLoading(false)
      alert('Error al confirmar la aceptación. Por favor, inténtalo de nuevo.')
      return
    }
    setStep('done')
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#0F172A',
    outline: 'none',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box',
    marginBottom: '12px',
  }

  if (signed) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: '20px', color: '#16A34A' }}>✓</span>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '400', color: '#0F172A', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Propuesta ya aceptada
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontFamily: 'sans-serif' }}>
          Esta propuesta fue firmada anteriormente.
        </p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: '20px', color: '#16A34A' }}>✓</span>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '400', color: '#0F172A', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Propuesta aceptada
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontFamily: 'sans-serif' }}>
          Recibiréis una copia por email en breve.
        </p>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <div>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          Introduce tu nombre para confirmar la aceptación
        </p>
        <input
          type="text"
          placeholder="Tu nombre completo"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleAccept}
          disabled={loading || !name.trim()}
          style={{
            width: '100%',
            background: loading || !name.trim() ? '#C7D2FE' : primary,
            color: loading || !name.trim() ? '#818CF8' : '#ffffff',
            border: 'none',
            padding: '16px',
            minHeight: '52px',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: 'sans-serif',
            cursor: loading || !name.trim() ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Confirmando...' : 'Confirmar aceptación →'}
        </button>
        <button
          onClick={() => setStep('idle')}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '13px', fontFamily: 'sans-serif', cursor: 'pointer', marginTop: '8px', padding: '8px' }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  /* idle + expired: botón deshabilitado inline */
  if (expired) {
    return (
      <div style={{ textAlign: 'center' }}>
        <button
          disabled
          style={{
            width: '100%',
            background: '#F1F5F9',
            color: '#94A3B8',
            border: '1px solid #E2E8F0',
            padding: '16px',
            minHeight: '52px',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: 'sans-serif',
            cursor: 'not-allowed',
          }}
        >
          Propuesta expirada
        </button>
      </div>
    )
  }

  /* idle normal — sticky en mobile, inline en desktop */
  if (isSticky) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderTop: '1px solid #E2E8F0',
          padding: '10px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          zIndex: 50,
        }}
      >
        <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 8px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          Si todo te parece bien, acéptala en un clic. Sin papeles, sin trámites.
        </p>
        <button
          onClick={() => setStep('form')}
          style={{
            width: '100%',
            background: primary,
            color: '#ffffff',
            border: 'none',
            padding: '14px',
            minHeight: '50px',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: 'sans-serif',
            cursor: 'pointer',
          }}
        >
          Aceptar esta propuesta →
        </button>
      </div>
    )
  }

  /* idle normal — desktop inline */
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', fontFamily: 'sans-serif' }}>
        Si todo te parece bien, acéptala en un clic. Sin papeles, sin trámites.
      </p>
      <button
        onClick={() => setStep('form')}
        style={{
          width: '100%',
          background: primary,
          color: '#ffffff',
          border: 'none',
          padding: '16px',
          minHeight: '52px',
          borderRadius: '10px',
          fontSize: '15px',
          fontFamily: 'sans-serif',
          cursor: 'pointer',
        }}
      >
        Aceptar esta propuesta →
      </button>
      <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '12px', fontFamily: 'sans-serif' }}>
        Recibirás una copia por email al aceptar
      </p>
    </div>
  )
}
