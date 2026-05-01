'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const primary = '#4F6EF7'
const primaryLight = '#EEF1FE'
const border  = 'var(--border)'
const ink     = 'var(--text-primary)'
const mid     = 'var(--text-secondary)'

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg-surface)', border: `0.5px solid ${border}`,
  borderRadius: '8px', padding: '9px 12px', fontSize: '13px',
  color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function SettingsPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [userId,      setUserId]      = useState<string | null>(null)
  const [name,        setName]        = useState('')
  const [logoUrl,     setLogoUrl]     = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile,    setLogoFile]    = useState<File | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg,  setProfileMsg]  = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [templates,   setTemplates]   = useState<{ id: string; name: string }[]>([])
  const [deletingTpl, setDeletingTpl] = useState<string | null>(null)
  const [dark,        setDark]        = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
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

  const toggleTheme = () => {
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    setSavingProfile(true); setProfileMsg('')
    let finalLogoUrl = logoUrl
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${userId}/logo.${ext}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      if (uploadError) { setProfileMsg('Error al subir el logo: ' + uploadError.message); setSavingProfile(false); return }
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
      finalLogoUrl = urlData.publicUrl; setLogoUrl(finalLogoUrl)
    }
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, name, logo_url: finalLogoUrl }, { onConflict: 'user_id' })
    setProfileMsg(error ? 'Error: ' + error.message : '✓ Perfil actualizado')
    setSavingProfile(false)
  }

  const handleDeleteTemplate = async (id: string) => {
    setDeletingTpl(id)
    await supabase.from('templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeletingTpl(null)
  }

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) { setPasswordMsg('Mínimo 6 caracteres'); return }
    setSavingPassword(true); setPasswordMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordMsg(error ? 'Error: ' + error.message : '✓ Contraseña actualizada')
    if (!error) setNewPassword('')
    setSavingPassword(false)
  }

  const currentLogo = logoPreview ?? logoUrl

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: mid, fontSize: '13px', fontFamily: 'inherit' }}>
      Cargando...
    </div>
  )

  const Section = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: 'var(--bg-card)', border: `0.5px solid ${border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
      {children}
    </div>
  )

  const SectionHeader = ({ label }: { label: string }) => (
    <div style={{ borderBottom: `0.5px solid ${border}`, padding: '13px 18px' }}>
      <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
    </div>
  )

  const Msg = ({ text }: { text: string }) => text ? (
    <div style={{ background: text.startsWith('✓') ? '#EAF3DE' : '#FEE', border: `0.5px solid ${text.startsWith('✓') ? '#639922' : '#A32D2D'}30`, borderRadius: '8px', padding: '9px 12px', marginBottom: '14px' }}>
      <p style={{ fontSize: '12px', color: text.startsWith('✓') ? '#3B6D11' : '#A32D2D', margin: 0 }}>{text}</p>
    </div>
  ) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'system-ui, -apple-system, sans-serif', color: ink }}>

      {/* Nav */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: `0.5px solid ${border}`, height: '52px', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', marginRight: '28px' }}>
          propos<span style={{ color: primary }}>ly</span>
        </span>
        <a href="/dashboard" style={{ fontSize: '13px', color: mid, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none' }}>Propuestas</a>
        <a href="/stats" style={{ fontSize: '13px', color: mid, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none' }}>Estadísticas</a>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ fontSize: '14px', background: 'none', border: `0.5px solid ${border}`, padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', color: mid }}>
            {dark ? '☀' : '🌙'}
          </button>
          <span style={{ fontSize: '13px', color: primary, background: primaryLight, padding: '5px 12px', borderRadius: '20px', fontWeight: '500' }}>Ajustes</span>
        </div>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px 80px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '500', margin: '0 0 2px', letterSpacing: '-0.3px', color: ink }}>Ajustes</h1>
          <p style={{ fontSize: '12px', color: mid, margin: 0 }}>Gestiona tu perfil y preferencias de cuenta</p>
        </div>

        {/* Perfil */}
        <Section>
          <SectionHeader label="Perfil" />
          <div style={{ padding: '18px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Nombre o agencia</label>
              <input style={inp} type="text" placeholder="Tu nombre o el de tu agencia" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ width: '72px', height: '72px', borderRadius: '12px', border: `1px dashed ${border}`, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                  {currentLogo
                    ? <img src={currentLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: '22px' }}>🖼️</span>
                  }
                </div>
                <div>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ background: primaryLight, border: `0.5px solid #C4CEFC`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', color: primary, cursor: 'pointer', display: 'block', marginBottom: '5px', fontFamily: 'inherit', fontWeight: '500' }}>
                    {currentLogo ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <span style={{ fontSize: '11px', color: mid }}>PNG, JPG o SVG · Aparece en las propuestas</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
            </div>

            <Msg text={profileMsg} />

            <button onClick={handleSaveProfile} disabled={savingProfile}
              style={{ background: savingProfile ? 'var(--bg-surface)' : primary, color: savingProfile ? mid : '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: savingProfile ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </Section>

        {/* Plantillas */}
        <Section>
          <SectionHeader label="Mis plantillas" />
          <div style={{ padding: '18px' }}>
            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ fontSize: '13px', color: mid, margin: '0 0 3px' }}>No tienes plantillas guardadas</p>
                <p style={{ fontSize: '12px', color: mid, margin: 0, opacity: 0.7 }}>Créalas desde el editor de propuestas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {templates.map(tpl => (
                  <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: `0.5px solid ${border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: primary, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: ink, fontWeight: '500' }}>{tpl.name}</span>
                    </div>
                    <button onClick={() => handleDeleteTemplate(tpl.id)} disabled={deletingTpl === tpl.id}
                      style={{ background: 'none', border: '0.5px solid rgba(162,45,45,0.3)', borderRadius: '6px', color: '#A32D2D', fontSize: '12px', cursor: deletingTpl === tpl.id ? 'default' : 'pointer', padding: '4px 10px', fontFamily: 'inherit' }}>
                      {deletingTpl === tpl.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Contraseña */}
        <Section>
          <SectionHeader label="Seguridad" />
          <div style={{ padding: '18px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Nueva contraseña</label>
              <input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            <Msg text={passwordMsg} />

            <button onClick={handleSavePassword} disabled={savingPassword}
              style={{ background: savingPassword ? 'var(--bg-surface)' : primary, color: savingPassword ? mid : '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: savingPassword ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </Section>

      </div>
    </div>
  )
}
