'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLogo from '@/components/UserLogo'

const pageBg = 'linear-gradient(160deg, #EDF5FC 0%, #F5F9FD 55%, #EAF3FA 100%)'
const topbar = '#0F2A3D'
const ink = '#0F2A3D'
const mid = '#6B8A9E'
const border = '#E2EBF2'
const cardBg = '#ffffff'
const accent = '#4A7FA5'

const input: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid #E2EBF2',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: '#0F2A3D',
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
      if (data) { setName(data.name ?? ''); setLogoUrl(data.logo_url ?? null) }
      const { data: tpls } = await supabase.from('templates').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false })
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
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      if (uploadError) { setProfileMsg('Error al subir el logo: ' + uploadError.message); setSavingProfile(false); return }
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
      finalLogoUrl = urlData.publicUrl
      setLogoUrl(finalLogoUrl)
    }
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, name, logo_url: finalLogoUrl }, { onConflict: 'user_id' })
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
    if (!newPassword || newPassword.length < 6) { setPasswordMsg('La contraseña debe tener al menos 6 caracteres'); return }
    setSavingPassword(true)
    setPasswordMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordMsg(error ? 'Error: ' + error.message : '✓ Contraseña actualizada')
    if (!error) setNewPassword('')
    setSavingPassword(false)
  }

  const currentLogo = logoPreview ?? logoUrl

  if (loading) return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '14px', fontFamily: 'sans-serif' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', color: ink }}>
      <div style={{ background: topbar, padding: '0 32px', display: 'flex', alignItems: 'center', height: '64px', boxShadow: '0 4px 24px rgba(10,26,41,0.3)' }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
          ← Dashboard
        </a>
        <div style={{ margin: '0 auto' }}>
          <UserLogo />
        </div>
        <div style={{ width: '100px' }} />
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '52px 24px 80px' }}>
        <div style={{ marginBottom: '44px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: '400', color: ink, margin: '0 0 6px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>Ajustes</h1>
          <p style={{ fontSize: '14px', color: mid, margin: 0 }}>Gestiona tu perfil y las preferencias de tu cuenta</p>
        </div>

        {/* Perfil */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '32px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EAF4FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: ink, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Perfil</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: mid, display: 'block', marginBottom: '6px', fontWeight: '500' }}>Nombre o agencia</label>
            <input style={input} type="text" placeholder="Tu nombre o el de tu agencia" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '13px', color: mid, display: 'block', marginBottom: '10px', fontWeight: '500' }}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ width: '80px', height: '80px', borderRadius: '14px', border: `1.5px dashed ${border}`, background: '#F8FBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = '#EAF4FB' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = '#F8FBFE' }}
              >
                {currentLogo
                  ? <img src={currentLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: '26px' }}>🖼️</span>
                }
              </div>
              <div>
                <button onClick={() => fileRef.current?.click()}
                  style={{ background: '#EAF4FB', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: accent, cursor: 'pointer', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  {currentLogo ? 'Cambiar logo' : 'Subir logo'}
                </button>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>PNG, JPG o SVG · Aparece en las propuestas</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </div>

          {profileMsg && (
            <div style={{ background: profileMsg.startsWith('✓') ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${profileMsg.startsWith('✓') ? '#86EFAC' : '#FCA5A5'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: profileMsg.startsWith('✓') ? '#15803D' : '#DC2626', margin: 0 }}>{profileMsg}</p>
            </div>
          )}

          <button onClick={handleSaveProfile} disabled={savingProfile}
            style={{ background: savingProfile ? '#E2EBF2' : accent, color: savingProfile ? mid : '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: savingProfile ? 'default' : 'pointer', boxShadow: savingProfile ? 'none' : '0 4px 14px rgba(74,127,165,0.35)', letterSpacing: '0.2px' }}>
            {savingProfile ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>

        {/* Plantillas */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '32px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📄</div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: ink, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Mis plantillas</p>
          </div>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 4px' }}>Aún no tienes plantillas guardadas.</p>
              <p style={{ fontSize: '12px', color: '#B8C9D4', margin: 0 }}>Créalas desde el editor de propuestas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map(tpl => (
                <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FBFE', borderRadius: '10px', border: `1px solid ${border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: ink, fontWeight: '500' }}>{tpl.name}</span>
                  </div>
                  <button onClick={() => handleDeleteTemplate(tpl.id)} disabled={deletingTpl === tpl.id}
                    style={{ background: 'transparent', border: '1px solid #FECACA', borderRadius: '6px', color: '#EF4444', fontSize: '12px', cursor: 'pointer', padding: '5px 12px', fontWeight: '600' }}>
                    {deletingTpl === tpl.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contraseña */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🔒</div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: ink, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Seguridad</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: mid, display: 'block', marginBottom: '6px', fontWeight: '500' }}>Nueva contraseña</label>
            <input style={input} type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>

          {passwordMsg && (
            <div style={{ background: passwordMsg.startsWith('✓') ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${passwordMsg.startsWith('✓') ? '#86EFAC' : '#FCA5A5'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: passwordMsg.startsWith('✓') ? '#15803D' : '#DC2626', margin: 0 }}>{passwordMsg}</p>
            </div>
          )}

          <button onClick={handleSavePassword} disabled={savingPassword}
            style={{ background: savingPassword ? '#E2EBF2' : accent, color: savingPassword ? mid : '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: savingPassword ? 'default' : 'pointer', boxShadow: savingPassword ? 'none' : '0 4px 14px rgba(74,127,165,0.35)', letterSpacing: '0.2px' }}>
            {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}
