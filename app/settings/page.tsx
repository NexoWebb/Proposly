'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLogo from '@/components/UserLogo'

const pageBg = '#D6E8F5'
const topbar = '#4A7FA5'
const ink = '#0F2A3D'
const mid = '#5A7A8F'
const border = '#B8D4E8'
const cardBg = 'rgba(255,255,255,0.82)'
const accent = '#4A7FA5'

const input: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.9)',
  border: `1px solid ${border}`,
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: ink,
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
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [deletingTpl, setDeletingTpl] = useState<string | null>(null)

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
      const { data: tpls } = await supabase
        .from('templates')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setTemplates(tpls ?? [])
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

  const handleDeleteTemplate = async (id: string) => {
    setDeletingTpl(id)
    await supabase.from('templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeletingTpl(null)
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
      <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '14px', fontFamily: 'sans-serif' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', color: ink }}>
      <div style={{ background: topbar, padding: '0 40px', display: 'flex', alignItems: 'center', height: '56px', boxShadow: '0 2px 16px rgba(74,127,165,0.2)' }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Dashboard
        </a>
        <div style={{ margin: '0 auto' }}>
          <UserLogo />
        </div>
        <div style={{ width: '80px' }} />
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '400', color: ink, margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Ajustes</h1>
          <p style={{ fontSize: '13px', color: mid, margin: 0 }}>Gestiona tu perfil y las preferencias de tu cuenta</p>
        </div>

        {/* Perfil */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '28px', marginBottom: '16px', backdropFilter: 'blur(8px)' }}>
          <p style={{ fontSize: '11px', color: mid, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 20px' }}>Perfil</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: mid, display: 'block', marginBottom: '6px' }}>Nombre</label>
            <input style={input} type="text" placeholder="Tu nombre o el de tu agencia" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: mid, display: 'block', marginBottom: '6px' }}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '72px', height: '72px', borderRadius: '10px',
                  border: `1px dashed ${border}`, background: 'rgba(255,255,255,0.6)',
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
                  style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '20px', padding: '8px 14px', fontSize: '13px', color: mid, cursor: 'pointer', display: 'block', marginBottom: '4px' }}
                >
                  {currentLogo ? 'Cambiar logo' : 'Subir logo'}
                </button>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>PNG, JPG o SVG. Aparece en las propuestas.</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </div>

          {profileMsg && (
            <p style={{ fontSize: '13px', color: profileMsg.startsWith('✓') ? '#4A9B6F' : '#C4624A', marginBottom: '12px' }}>{profileMsg}</p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            style={{ background: savingProfile ? border : accent, color: savingProfile ? mid : '#fff', border: 'none', borderRadius: '20px', padding: '11px 24px', fontSize: '14px', fontWeight: '500', cursor: savingProfile ? 'default' : 'pointer', boxShadow: savingProfile ? 'none' : '0 4px 12px rgba(74,127,165,0.3)' }}
          >
            {savingProfile ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>

        {/* Plantillas */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '28px', marginBottom: '16px', backdropFilter: 'blur(8px)' }}>
          <p style={{ fontSize: '11px', color: mid, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 20px' }}>Mis plantillas</p>
          {templates.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Aún no tienes plantillas guardadas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map(tpl => (
                <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: '10px', border: `1px solid ${border}` }}>
                  <span style={{ fontSize: '14px', color: ink, fontFamily: 'sans-serif' }}>{tpl.name}</span>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    disabled={deletingTpl === tpl.id}
                    style={{ background: 'transparent', border: 'none', color: '#C4624A', fontSize: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontFamily: 'sans-serif' }}
                  >
                    {deletingTpl === tpl.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contraseña */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '28px', backdropFilter: 'blur(8px)' }}>
          <p style={{ fontSize: '11px', color: mid, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 20px' }}>Seguridad</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: mid, display: 'block', marginBottom: '6px' }}>Nueva contraseña</label>
            <input style={input} type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>

          {passwordMsg && (
            <p style={{ fontSize: '13px', color: passwordMsg.startsWith('✓') ? '#4A9B6F' : '#C4624A', marginBottom: '12px' }}>{passwordMsg}</p>
          )}

          <button
            onClick={handleSavePassword}
            disabled={savingPassword}
            style={{ background: savingPassword ? border : accent, color: savingPassword ? mid : '#fff', border: 'none', borderRadius: '20px', padding: '11px 24px', fontSize: '14px', fontWeight: '500', cursor: savingPassword ? 'default' : 'pointer', boxShadow: savingPassword ? 'none' : '0 4px 12px rgba(74,127,165,0.3)' }}
          >
            {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}
