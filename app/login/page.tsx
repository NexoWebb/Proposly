'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type View = 'login' | 'reset' | 'reset-sent'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  const handleReset = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setView('reset-sent')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', border: '1px solid #E2E8F0', width: '100%', maxWidth: '360px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#0F172A', letterSpacing: '-0.3px' }}>Proposly</span>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        {view === 'login' && (
          <>
            <input style={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={{ ...input, marginBottom: '8px' }} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />

            <button
              onClick={() => { setError(''); setView('reset') }}
              style={{ background: 'none', border: 'none', color: '#4361EE', fontSize: '12px', cursor: 'pointer', padding: '0 0 20px', display: 'block' }}
            >
              Olvidé mi contraseña
            </button>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width: '100%', background: '#4361EE', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '8px' }}
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{ width: '100%', background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px', fontSize: '14px', cursor: 'pointer' }}
            >
              Crear cuenta
            </button>
          </>
        )}

        {view === 'reset' && (
          <>
            <p style={{ fontSize: '14px', color: '#0F172A', marginBottom: '16px', fontWeight: '500' }}>
              Restablecer contraseña
            </p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Escribe tu email y te enviaremos un link para crear una nueva contraseña.
            </p>
            <input style={{ ...input, marginBottom: '16px' }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <button
              onClick={handleReset}
              disabled={loading || !email}
              style={{ width: '100%', background: '#4361EE', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '8px' }}
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <button
              onClick={() => { setError(''); setView('login') }}
              style={{ width: '100%', background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px', fontSize: '14px', cursor: 'pointer' }}
            >
              Volver
            </button>
          </>
        )}

        {view === 'reset-sent' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>
              ✉️
            </div>
            <p style={{ fontSize: '15px', fontWeight: '500', color: '#0F172A', marginBottom: '8px' }}>
              Email enviado
            </p>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px', lineHeight: '1.6' }}>
              Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el link para crear una nueva contraseña.
            </p>
            <button
              onClick={() => setView('login')}
              style={{ width: '100%', background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px', fontSize: '14px', cursor: 'pointer' }}
            >
              Volver al login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
