'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const bg = '#F5F0EB'
const ink = '#1A1208'
const mid = '#8C7B6B'
const border = '#DDD5C8'
const cream = '#FAF7F3'

type View = 'login' | 'reset' | 'reset-sent'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inp: React.CSSProperties = {
    width: '100%', background: cream, border: `1px solid ${border}`,
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
    color: ink, outline: 'none', fontFamily: 'sans-serif',
    boxSizing: 'border-box', marginBottom: '10px',
  }

  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  const handleReset = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error) setError(error.message)
    else setView('reset-sent')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, fontFamily: 'sans-serif' }}>
      <div style={{ background: cream, padding: '40px', borderRadius: '16px', border: `1px solid ${border}`, width: '100%', maxWidth: '360px' }}>

        <div style={{ marginBottom: '32px' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '400', color: ink, letterSpacing: '-0.3px' }}>Proposly</span>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#C4624A', background: '#FDF0EB', border: '1px solid #E8C4B0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        {view === 'login' && (
          <>
            <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={{ ...inp, marginBottom: '8px' }} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={() => { setError(''); setView('reset') }}
              style={{ background: 'none', border: 'none', color: mid, fontSize: '12px', cursor: 'pointer', padding: '0 0 20px', display: 'block' }}>
              Olvidé mi contraseña
            </button>
            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', background: ink, color: cream, border: 'none', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '8px' }}>
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
            <button onClick={handleRegister} disabled={loading}
              style={{ width: '100%', background: 'transparent', color: mid, border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '14px', cursor: 'pointer' }}>
              Crear cuenta
            </button>
          </>
        )}

        {view === 'reset' && (
          <>
            <p style={{ fontSize: '14px', color: ink, marginBottom: '8px', fontWeight: '500', fontFamily: 'Georgia, serif' }}>Restablecer contraseña</p>
            <p style={{ fontSize: '13px', color: mid, marginBottom: '16px' }}>Escribe tu email y te enviaremos un link para crear una nueva contraseña.</p>
            <input style={{ ...inp, marginBottom: '16px' }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <button onClick={handleReset} disabled={loading || !email}
              style={{ width: '100%', background: ink, color: cream, border: 'none', borderRadius: '10px', padding: '11px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '8px' }}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <button onClick={() => { setError(''); setView('login') }}
              style={{ width: '100%', background: 'transparent', color: mid, border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '14px', cursor: 'pointer' }}>
              Volver
            </button>
          </>
        )}

        {view === 'reset-sent' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>
              ✉️
            </div>
            <p style={{ fontSize: '15px', fontWeight: '500', color: ink, marginBottom: '8px', fontFamily: 'Georgia, serif' }}>Email enviado</p>
            <p style={{ fontSize: '13px', color: mid, marginBottom: '24px', lineHeight: '1.6' }}>
              Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el link para crear una nueva contraseña.
            </p>
            <button onClick={() => setView('login')}
              style={{ width: '100%', background: 'transparent', color: mid, border: `1px solid ${border}`, borderRadius: '10px', padding: '11px', fontSize: '14px', cursor: 'pointer' }}>
              Volver al login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}