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

  const lineInput: React.CSSProperties = {
    width: '100%', background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)',
    padding: '12px 0', fontSize: '15px', color: '#fff',
    outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, #C4A882 0%, #8C7B6B 35%, #4A3728 70%, #1A1208 100%)',
    }}>
      {/* Blur orbs */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(196,168,130,0.3)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(140,123,107,0.25)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: '380px', padding: '48px 40px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.15)',
        position: 'relative', zIndex: 1,
      }}>

        <div style={{ marginBottom: '40px' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: '400', color: '#fff', letterSpacing: '-0.3px' }}>Proposly</span>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#FFCBA4', background: 'rgba(255,150,80,0.15)', border: '1px solid rgba(255,150,80,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px' }}>
            {error}
          </p>
        )}

        {view === 'login' && (
          <>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '400', color: '#fff', margin: '0 0 32px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
              Entra en<br />tu cuenta
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <input style={lineInput} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <input style={lineInput} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
              <button onClick={() => { setError(''); setView('reset') }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', background: '#1A1208', color: '#FAF7F3', border: 'none', borderRadius: '50px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginBottom: '12px', transition: 'opacity 0.15s' }}>
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
            <button onClick={handleRegister} disabled={loading}
              style={{ width: '100%', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '14px', fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.15s' }}>
              Crear cuenta
            </button>

            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '24px' }}>
              Para agencias y autónomos en España
            </p>
          </>
        )}

        {view === 'reset' && (
          <>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: '400', color: '#fff', margin: '0 0 12px' }}>
              Restablecer contraseña
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: 1.6 }}>
              Escribe tu email y te enviaremos un link para crear una nueva contraseña.
            </p>
            <div style={{ marginBottom: '28px' }}>
              <input style={lineInput} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button onClick={handleReset} disabled={loading || !email}
              style={{ width: '100%', background: '#1A1208', color: '#FAF7F3', border: 'none', borderRadius: '50px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginBottom: '12px' }}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <button onClick={() => { setError(''); setView('login') }}
              style={{ width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '14px', fontSize: '15px', cursor: 'pointer' }}>
              Volver
            </button>
          </>
        )}

        {view === 'reset-sent' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>✉️</div>
            <p style={{ fontSize: '18px', fontWeight: '500', color: '#fff', marginBottom: '12px', fontFamily: 'Georgia, serif' }}>Email enviado</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px', lineHeight: 1.6 }}>
              Revisa tu bandeja de entrada en <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong> y sigue el link para crear una nueva contraseña.
            </p>
            <button onClick={() => setView('login')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '14px', fontSize: '15px', cursor: 'pointer' }}>
              Volver al login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}