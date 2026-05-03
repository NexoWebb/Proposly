'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'

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

export default function SettingsPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const isBelowDesktop = useIsMobile(1024)
  const isTablet = isBelowDesktop && !isMobile

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
  const [menuOpen,    setMenuOpen]    = useState(false)

  // Suscripción
  type SubscriptionRow = {
    plan: 'free' | 'pro'
    status: string
    current_period_end: string | null
    cancel_at_period_end: boolean
    stripe_subscription_id: string | null
  }
  const [subscription,      setSubscription]      = useState<SubscriptionRow | null>(null)
  const [showCancelModal,   setShowCancelModal]   = useState(false)
  const [cancelLoading,     setCancelLoading]     = useState(false)
  const [reactivateLoading, setReactivateLoading] = useState(false)
  const [portalLoading,     setPortalLoading]     = useState(false)
  const [upgradeLoading,    setUpgradeLoading]    = useState(false)
  const [subMsg,            setSubMsg]            = useState('')

  // Datos fiscales
  const [fiscalName,       setFiscalName]       = useState('')
  const [fiscalId,         setFiscalId]         = useState('')
  const [fiscalAddress,    setFiscalAddress]    = useState('')
  const [fiscalPostalCode, setFiscalPostalCode] = useState('')
  const [fiscalCity,       setFiscalCity]       = useState('')
  const [fiscalProvince,   setFiscalProvince]   = useState('')
  const [fiscalCountry,    setFiscalCountry]    = useState('España')
  const [defaultVatRate,   setDefaultVatRate]   = useState('21')
  const [defaultIrpfEnabled, setDefaultIrpfEnabled] = useState(false)
  const [defaultIrpfRate,  setDefaultIrpfRate]  = useState('15')
  const [savingFiscal,     setSavingFiscal]     = useState(false)
  const [fiscalMsg,        setFiscalMsg]        = useState('')
  const [fiscalIdError,    setFiscalIdError]    = useState('')

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) {
        setName(data.name ?? '')
        setLogoUrl(data.logo_url ?? null)
        setFiscalName(data.fiscal_name ?? '')
        setFiscalId(data.fiscal_id ?? '')
        setFiscalAddress(data.fiscal_address ?? '')
        setFiscalPostalCode(data.fiscal_postal_code ?? '')
        setFiscalCity(data.fiscal_city ?? '')
        setFiscalProvince(data.fiscal_province ?? '')
        setFiscalCountry(data.fiscal_country ?? 'España')
        setDefaultVatRate(data.default_vat_rate ?? '21')
        setDefaultIrpfEnabled(data.default_irpf_enabled ?? false)
        setDefaultIrpfRate(data.default_irpf_rate ?? '15')
      }
      const { data: tpls } = await supabase.from('templates').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false })
      setTemplates(tpls ?? [])
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id')
        .eq('user_id', user.id)
        .single()
      if (subData) setSubscription(subData as SubscriptionRow)
      setLoading(false)
    }
    load()
  }, [router])

  const toggleTheme = () => {
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

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

  const validateFiscalId = (val: string) => {
    if (!val) return true
    return /^(\d{8}[A-Za-z]|[XYZxyz]\d{7}[A-Za-z]|[A-HJNPQRSUVWa-hjnpqrsuvw]\d{7}[0-9A-Ja-j])$/.test(val)
  }

  const handleSaveFiscal = async () => {
    if (!userId) return
    if (fiscalId && !validateFiscalId(fiscalId)) {
      setFiscalIdError('Formato no válido (DNI: 8 dígitos+letra · NIE: X/Y/Z+7+letra · CIF: letra+7+control)')
      return
    }
    setFiscalIdError('')
    setSavingFiscal(true); setFiscalMsg('')
    const { error } = await supabase.from('profiles').upsert({
      user_id: userId,
      fiscal_name: fiscalName || null,
      fiscal_id: fiscalId || null,
      fiscal_address: fiscalAddress || null,
      fiscal_postal_code: fiscalPostalCode || null,
      fiscal_city: fiscalCity || null,
      fiscal_province: fiscalProvince || null,
      fiscal_country: fiscalCountry || 'España',
      default_vat_rate: defaultVatRate,
      default_irpf_enabled: defaultIrpfEnabled,
      default_irpf_rate: defaultIrpfEnabled ? defaultIrpfRate : null,
    }, { onConflict: 'user_id' })
    setFiscalMsg(error ? 'Error: ' + error.message : '✓ Datos fiscales guardados')
    setSavingFiscal(false)
  }

  const fmtPeriodEnd = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const handleUpgrade = async () => {
    setUpgradeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` } })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch { setSubMsg('Error al procesar el pago. Inténtalo de nuevo.') }
    finally { setUpgradeLoading(false) }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` } })
      const { url, error } = await res.json()
      if (error) { setSubMsg('Error al abrir el portal: ' + error); return }
      if (url) window.location.href = url
    } catch { setSubMsg('Error al abrir el portal de facturación.') }
    finally { setPortalLoading(false) }
  }

  const handleCancel = async () => {
    setCancelLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/cancel', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` } })
      if (res.ok) {
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : prev)
        setSubMsg('✓ Suscripción cancelada. Seguirás siendo Pro hasta el final del período.')
      } else {
        const { error } = await res.json()
        setSubMsg('Error al cancelar: ' + (error ?? 'inténtalo de nuevo'))
      }
    } catch { setSubMsg('Error al cancelar la suscripción.') }
    finally { setCancelLoading(false); setShowCancelModal(false) }
  }

  const handleReactivate = async () => {
    setReactivateLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/reactivate', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` } })
      if (res.ok) {
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: false } : prev)
        setSubMsg('✓ Suscripción reactivada. Se renovará automáticamente.')
      } else {
        const { error } = await res.json()
        setSubMsg('Error al reactivar: ' + (error ?? 'inténtalo de nuevo'))
      }
    } catch { setSubMsg('Error al reactivar la suscripción.') }
    finally { setReactivateLoading(false) }
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'system-ui, -apple-system, sans-serif', color: ink }}>

      {/* Nav */}
      <nav style={{ background: 'var(--bg-card)', borderBottom: `0.5px solid ${border}`, height: '52px', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px', marginRight: '28px' }}>
          propos<span style={{ color: primary }}>ly</span>
        </span>
        {!isMobile && (
          <>
            <a href="/dashboard" style={{ fontSize: '13px', color: mid, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none' }}>Propuestas</a>
            <a href="/stats" style={{ fontSize: '13px', color: mid, padding: '5px 12px', borderRadius: '20px', textDecoration: 'none' }}>Estadísticas</a>
          </>
        )}
        {isMobile ? (
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button aria-label="Menú" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
              style={{ width: '44px', height: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
              <span style={{ width: '20px', height: '1.5px', background: ink, borderRadius: '1px' }} />
            </button>
            {menuOpen && (
              <div onClick={e => e.stopPropagation()}
                style={{ position: 'fixed', top: '52px', left: 0, right: 0, background: 'var(--bg-card)', borderBottom: `0.5px solid ${border}`, padding: '8px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 20 }}>
                <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid ${border}` }}>Propuestas</a>
                <a href="/stats" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, textDecoration: 'none', borderBottom: `0.5px solid ${border}` }}>Estadísticas</a>
                <button onClick={() => { setMenuOpen(false); handleSignOut() }} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: `0.5px solid ${border}` }}>Cerrar sesión</button>
                <button onClick={() => { setMenuOpen(false); toggleTheme() }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', padding: '0 8px', fontSize: '14px', color: ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span>Modo {dark ? 'claro' : 'oscuro'}</span><span>{dark ? '☀' : '🌙'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={toggleTheme} style={{ fontSize: '14px', background: 'none', border: `0.5px solid ${border}`, padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', color: mid }}>
              {dark ? '☀' : '🌙'}
            </button>
            <span style={{ fontSize: '13px', color: primary, background: primaryLight, padding: '5px 12px', borderRadius: '20px', fontWeight: '500' }}>Ajustes</span>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: isMobile ? '20px 16px 80px' : isTablet ? '28px 24px 80px' : '32px 28px 80px' }}>

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
              style={{ background: savingProfile ? 'var(--bg-surface)' : primary, color: savingProfile ? mid : '#fff', border: 'none', borderRadius: '8px', padding: isMobile ? '12px 20px' : '9px 18px', fontSize: '13px', fontWeight: '500', cursor: savingProfile ? 'default' : 'pointer', fontFamily: 'inherit', minHeight: isMobile ? '44px' : 'auto' }}>
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </Section>

        {/* Datos fiscales */}
        <Section>
          <SectionHeader label="Datos fiscales" />
          <div style={{ padding: '18px' }}>
            <p style={{ fontSize: '12px', color: mid, margin: '0 0 16px', lineHeight: '1.5' }}>
              Aparecen en tus propuestas como datos del emisor. Requeridos para propuestas con valor legal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Nombre fiscal / razón social</label>
                <input style={inp} type="text" placeholder="Tu nombre o CIF de empresa" value={fiscalName} onChange={e => setFiscalName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>NIF / CIF</label>
                <input
                  style={{ ...inp, borderColor: fiscalIdError ? '#A32D2D' : undefined }}
                  type="text"
                  placeholder="12345678A / X1234567B / B12345678"
                  value={fiscalId}
                  onChange={e => { setFiscalId(e.target.value.toUpperCase()); setFiscalIdError('') }}
                />
                {fiscalIdError && <p style={{ fontSize: '11px', color: '#A32D2D', margin: '4px 0 0' }}>{fiscalIdError}</p>}
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Dirección fiscal</label>
              <input style={inp} type="text" placeholder="Calle, número, piso..." value={fiscalAddress} onChange={e => setFiscalAddress(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '120px 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>C.P.</label>
                <input style={inp} type="text" placeholder="28001" maxLength={5} value={fiscalPostalCode} onChange={e => setFiscalPostalCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ciudad</label>
                <input style={inp} type="text" placeholder="Madrid" value={fiscalCity} onChange={e => setFiscalCity(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Provincia</label>
                <input style={inp} type="text" placeholder="Madrid" value={fiscalProvince} onChange={e => setFiscalProvince(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>País</label>
              <input style={{ ...inp, maxWidth: isMobile ? '100%' : '200px' }} type="text" value={fiscalCountry} onChange={e => setFiscalCountry(e.target.value)} />
            </div>

            <div style={{ height: '0.5px', background: border, margin: '0 0 16px' }} />

            <p style={{ fontSize: '11px', color: mid, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px', margin: '0 0 12px' }}>Impuestos por defecto</p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>IVA por defecto</label>
                <select
                  style={{ ...inp, cursor: 'pointer' }}
                  value={defaultVatRate}
                  onChange={e => setDefaultVatRate(e.target.value)}
                >
                  <option value="21">21% (general)</option>
                  <option value="10">10% (reducido)</option>
                  <option value="4">4% (superreducido)</option>
                  <option value="exempt">Exento</option>
                  <option value="isp">Inversión sujeto pasivo (ISP)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>IRPF retenible</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '37px' }}>
                  <button
                    type="button"
                    onClick={() => setDefaultIrpfEnabled(v => !v)}
                    style={{
                      width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                      background: defaultIrpfEnabled ? primary : border, position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '3px', left: defaultIrpfEnabled ? '21px' : '3px',
                      width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    }} />
                  </button>
                  <span style={{ fontSize: '12px', color: mid }}>{defaultIrpfEnabled ? 'Activado' : 'Desactivado'}</span>
                </div>
              </div>
            </div>

            {defaultIrpfEnabled && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '11px', color: mid, display: 'block', marginBottom: '5px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tipo de IRPF</label>
                <select
                  style={{ ...inp, maxWidth: isMobile ? '100%' : '280px', cursor: 'pointer' }}
                  value={defaultIrpfRate}
                  onChange={e => setDefaultIrpfRate(e.target.value)}
                >
                  <option value="7">7% (nuevos autónomos)</option>
                  <option value="15">15% (régimen general)</option>
                </select>
              </div>
            )}

            <Msg text={fiscalMsg} />

            <button onClick={handleSaveFiscal} disabled={savingFiscal}
              style={{ background: savingFiscal ? 'var(--bg-surface)' : primary, color: savingFiscal ? mid : '#fff', border: 'none', borderRadius: '8px', padding: isMobile ? '12px 20px' : '9px 18px', fontSize: '13px', fontWeight: '500', cursor: savingFiscal ? 'default' : 'pointer', fontFamily: 'inherit', minHeight: isMobile ? '44px' : 'auto' }}>
              {savingFiscal ? 'Guardando...' : 'Guardar datos fiscales'}
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

        {/* Plan y suscripción */}
        <Section>
          <SectionHeader label="Plan y suscripción" />
          <div style={{ padding: '18px' }}>
            <Msg text={subMsg} />
            {subscription ? (() => {
              const isPro = subscription.plan === 'pro'
              const isCanceling = isPro && subscription.cancel_at_period_end
              const badgeBg    = isPro && !isCanceling ? '#EAF3DE' : isCanceling ? '#FFFBEB' : 'var(--bg-surface)'
              const badgeColor = isPro && !isCanceling ? '#3B6D11'  : isCanceling ? '#854F0B'  : mid
              const badgeBorder = isPro && !isCanceling ? '#63992230' : isCanceling ? '#BA751730' : `${border}30`
              const badgeDot   = isPro && !isCanceling ? '#639922'  : isCanceling ? '#BA7517'  : '#888'
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: badgeBg, color: badgeColor, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '500', border: `0.5px solid ${badgeBorder}` }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeDot, flexShrink: 0 }} />
                      {isPro && !isCanceling && 'Plan Pro'}
                      {isCanceling && 'Cancelación pendiente'}
                      {!isPro && 'Plan Gratuito'}
                    </span>
                    {isPro && subscription.current_period_end && (
                      <span style={{ fontSize: '12px', color: mid }}>
                        {isCanceling
                          ? `Activo hasta el ${fmtPeriodEnd(subscription.current_period_end)}`
                          : `Renueva el ${fmtPeriodEnd(subscription.current_period_end)}`}
                      </span>
                    )}
                  </div>

                  {!isPro && (
                    <p style={{ fontSize: '12px', color: mid, margin: '0 0 16px', lineHeight: '1.5' }}>
                      3 propuestas al mes. Con Pro, crea propuestas ilimitadas y accede a funciones avanzadas.
                    </p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {isPro && !isCanceling && (
                      <>
                        <button onClick={handlePortal} disabled={portalLoading}
                          style={{ background: primaryLight, border: '0.5px solid #C4CEFC', borderRadius: '8px', padding: isMobile ? '12px 16px' : '8px 16px', fontSize: '13px', color: primary, cursor: portalLoading ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: '500', opacity: portalLoading ? 0.7 : 1, minHeight: isMobile ? '44px' : 'auto' }}>
                          {portalLoading ? 'Cargando...' : 'Gestionar facturación'}
                        </button>
                        <button onClick={() => setShowCancelModal(true)}
                          style={{ background: 'none', border: '0.5px solid rgba(162,45,45,0.3)', borderRadius: '8px', padding: isMobile ? '12px 16px' : '8px 16px', fontSize: '13px', color: '#A32D2D', cursor: 'pointer', fontFamily: 'inherit', minHeight: isMobile ? '44px' : 'auto' }}>
                          Cancelar suscripción
                        </button>
                      </>
                    )}
                    {isCanceling && (
                      <button onClick={handleReactivate} disabled={reactivateLoading}
                        style={{ background: primary, border: 'none', borderRadius: '8px', padding: isMobile ? '12px 16px' : '8px 16px', fontSize: '13px', color: '#fff', cursor: reactivateLoading ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: '500', opacity: reactivateLoading ? 0.7 : 1, minHeight: isMobile ? '44px' : 'auto' }}>
                        {reactivateLoading ? 'Procesando...' : 'Reactivar suscripción'}
                      </button>
                    )}
                    {!isPro && (
                      <button onClick={handleUpgrade} disabled={upgradeLoading}
                        style={{ background: primary, border: 'none', borderRadius: '8px', padding: isMobile ? '12px 16px' : '8px 16px', fontSize: '13px', color: '#fff', cursor: upgradeLoading ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: '500', opacity: upgradeLoading ? 0.7 : 1, minHeight: isMobile ? '44px' : 'auto' }}>
                        {upgradeLoading ? 'Cargando...' : 'Mejora a Pro →'}
                      </button>
                    )}
                  </div>
                </>
              )
            })() : (
              <p style={{ fontSize: '13px', color: mid, margin: 0, textAlign: 'center', padding: '12px 0' }}>
                Sin suscripción activa · <button onClick={handleUpgrade} disabled={upgradeLoading}
                  style={{ background: 'none', border: 'none', color: primary, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>
                  {upgradeLoading ? 'Cargando...' : 'Mejora a Pro'}
                </button>
              </p>
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
              style={{ background: savingPassword ? 'var(--bg-surface)' : primary, color: savingPassword ? mid : '#fff', border: 'none', borderRadius: '8px', padding: isMobile ? '12px 20px' : '9px 18px', fontSize: '13px', fontWeight: '500', cursor: savingPassword ? 'default' : 'pointer', fontFamily: 'inherit', minHeight: isMobile ? '44px' : 'auto' }}>
              {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </Section>

      </div>

      {/* Modal cancelar suscripción */}
      {showCancelModal && (
        <div onClick={() => setShowCancelModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: isMobile ? '24px 20px' : '28px 24px', maxWidth: '400px', width: '100%' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: ink, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
              ¿Cancelar suscripción?
            </h2>
            <p style={{ fontSize: '13px', color: mid, margin: '0 0 20px', lineHeight: '1.6' }}>
              {subscription?.current_period_end
                ? <>Seguirás siendo Pro hasta el <strong style={{ color: ink }}>{fmtPeriodEnd(subscription.current_period_end)}</strong>. Después volverás al plan Free y podrás crear 3 propuestas al mes.</>
                : 'Después de cancelar volverás al plan Free y podrás crear 3 propuestas al mes.'}
            </p>
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              style={{ width: '100%', background: '#A32D2D', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: cancelLoading ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: '8px', opacity: cancelLoading ? 0.7 : 1, minHeight: '44px' }}>
              {cancelLoading ? 'Procesando...' : 'Cancelar suscripción'}
            </button>
            <button
              onClick={() => setShowCancelModal(false)}
              style={{ width: '100%', background: 'none', border: 'none', color: mid, fontSize: '13px', cursor: 'pointer', padding: '8px', fontFamily: 'inherit' }}>
              Mantener Pro
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
