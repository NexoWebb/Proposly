'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase extrae el token del hash de la URL y establece la sesión automáticamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async () => {
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const input: React.CSSProperties = {
    width: '100%',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#0F172A',
    outline: 'none',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box',
    marginBottom: '10px',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', border: '1px solid #E2E8F0', width: '100%', maxWidth: '360px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#0F172A', letterSpacing: '-0.3px' }}>Proposly</span>
        </div>

        {!ready ? (
          <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center' }}>
            Verificando enlace...
          </p>
        ) : (
          <>
            <p style={{ fontSize: '15px', fontWeight: '500', color: '#0F172A', marginBottom: '8px' }}>
              Nueva contraseña
            </p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Escribe tu nueva contraseña para acceder a tu cuenta.
            </p>

            {error && (
              <p style={{ fontSize: '13px', color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
                {error}
              </p>
            )}

            <input
              style={input}
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              style={{ ...input, marginBottom: '20px' }}
              type="password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />

            <button
              onClick={handleUpdate}
              disabled={loading || !password || !confirm}
              style={{
                width: '100%',
                background: loading || !password || !confirm ? '#C7D2FE' : '#4361EE',
                color: loading || !password || !confirm ? '#818CF8' : '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '11px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || !password || !confirm ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
