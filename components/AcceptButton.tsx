'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AcceptButton({ proposalId, signed }: { proposalId: string, signed: boolean }) {
  const [step, setStep] = useState<'idle' | 'form' | 'done'>('idle')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    if (!name.trim()) return
    setLoading(true)

    await supabase
      .from('proposals')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signer_name: name,
      })
      .eq('id', proposalId)

    setStep('done')
    setLoading(false)
  }

  if (signed) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#a8e063', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: '20px' }}>✓</span>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Propuesta ya aceptada
        </h3>
        <p style={{ fontSize: '13px', color: '#999', margin: 0, fontFamily: 'sans-serif' }}>
          Esta propuesta fue firmada anteriormente.
        </p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#a8e063', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: '20px' }}>✓</span>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
          Propuesta aceptada
        </h3>
        <p style={{ fontSize: '13px', color: '#999', margin: 0, fontFamily: 'sans-serif' }}>
          Recibiréis una copia por email en breve.
        </p>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <div>
        <p style={{ fontSize: '13px', color: '#999', marginBottom: '16px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          Introduce tu nombre para confirmar la aceptación
        </p>
        <input
          type="text"
          placeholder="Tu nombre completo"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#0f0f0f', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        <button
          onClick={handleAccept}
          disabled={loading || !name.trim()}
          style={{ width: '100%', background: '#0f0f0f', color: '#ffffff', border: 'none', padding: '16px', borderRadius: '10px', fontSize: '15px', fontFamily: 'sans-serif', cursor: 'pointer', opacity: loading || !name.trim() ? 0.5 : 1 }}
        >
          {loading ? 'Confirmando...' : 'Confirmar aceptación →'}
        </button>
        <button
          onClick={() => setStep('idle')}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#999', fontSize: '13px', fontFamily: 'sans-serif', cursor: 'pointer', marginTop: '8px', padding: '8px' }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '13px', color: '#999', marginBottom: '20px', fontFamily: 'sans-serif' }}>
        ¿Todo correcto? Acepta con un clic, sin descargar nada.
      </p>
      <button
        onClick={() => setStep('form')}
        style={{ width: '100%', background: '#0f0f0f', color: '#ffffff', border: 'none', padding: '16px', borderRadius: '10px', fontSize: '15px', fontFamily: 'sans-serif', cursor: 'pointer' }}
      >
        Aceptar esta propuesta →
      </button>
      <p style={{ fontSize: '12px', color: '#bbb', marginTop: '12px', fontFamily: 'sans-serif' }}>
        Recibiréis una copia por email al aceptar
      </p>
    </div>
  )
}