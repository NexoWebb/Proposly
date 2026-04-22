'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
        <h1 className="text-xl font-medium text-gray-900 mb-6">Proposly</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-gray-400"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-gray-400"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium mb-2"
        >
          {loading ? 'Cargando...' : 'Entrar'}
        </button>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full border border-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium"
        >
          Crear cuenta
        </button>
      </div>
    </div>
  )
}