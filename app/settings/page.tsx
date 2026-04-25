'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
}

export default function SettingsPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) {
        setName(data.name ?? '')
        setLogoUrl(data.logo_url ?? null)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    setSavingProfile(true)
    setProfileMsg('')

    let finalLogoUrl = logoUrl

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${userId}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, logoFile, { upsert: true })

      if (uploadError) {
        setProfileMsg('Error al subir el logo: ' + uploadError.message)
        setSavingProfile(false)
        return
      }

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
      finalLogoUrl = urlData.publicUrl
      setLogoUrl(finalLogoUrl)
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, name, logo_url: finalLogoUrl }, { onConflict: 'user_id' })

    setProfileMsg(error ? 'Error al guardar: ' + error.message : '✓ Perfil actualizado')
    setSavingProfile(false)
  }

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setSavingPassword(true)
    setPasswordMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordMsg(error ? 'Error: ' + error.message : '✓ Contraseña actualizada')
    if (!error) setNewPassword('')
    setSavingPassword(false)
  }

  const currentLogo = logoPreview ?? logoUrl

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '14px', fontFamily: 'sans-serif' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1C2B5E', padding: '0 40px', display: 'flex', alignItems: 'center', height: '56px' }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Dashboard
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
          <span style={{ color: '#ffffff', fontSize: '15px', letterSpacing: '-0.3px', fontWeight: '500' }}>Proposly</span>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '400', color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Ajustes</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Gestiona tu perfil y las preferencias de tu cuenta</p>
        </div>

        {/* Perfil */}
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 20px' }}>Perfil</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Nombre</label>
            <input style={input} type="text" placeholder="Tu nombre o el de tu agencia" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '72px', height: '72px', borderRadius: '10px',
                  border: '1px dashed #CBD5E1', background: '#F8FAFC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                }}
              >
                {currentLogo
                  ? <img src={currentLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: '22px' }}>🖼️</span>
                }
              </div>
              <div>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#64748B', cursor: 'pointer', display: 'block', marginBottom: '4px' }}
                >
                  {currentLogo ? 'Cambiar logo' : 'Subir logo'}
                </button>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>PNG, JPG o SVG. Aparece en las propuestas.</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </div>

          {profileMsg && (
            <p style={{ fontSize: '13px', color: profileMsg.startsWith('✓') ? '#22C55E' : '#EF4444', marginBottom: '12px' }}>{profileMsg}</p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            style={{ background: savingProfile ? '#C7D2FE' : '#4361EE', color: savingProfile ? '#818CF8' : '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', fontWeight: '500', cursor: savingProfile ? 'default' : 'pointer' }}
          >
            {savingProfile ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>

        {/* Contraseña */}
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px' }}>
          <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 20px' }}>Seguridad</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Nueva contraseña</label>
            <input style={input} type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>

          {passwordMsg && (
            <p style={{ fontSize: '13px', color: passwordMsg.startsWith('✓') ? '#22C55E' : '#EF4444', marginBottom: '12px' }}>{passwordMsg}</p>
          )}

          <button
            onClick={handleSavePassword}
            disabled={savingPassword}
            style={{ background: savingPassword ? '#C7D2FE' : '#4361EE', color: savingPassword ? '#818CF8' : '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', fontWeight: '500', cursor: savingPassword ? 'default' : 'pointer' }}
          >
            {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}
