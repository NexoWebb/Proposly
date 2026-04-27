'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function UserLogo() {
  const [profile, setProfile] = useState<{ name: string | null; logo_url: string | null } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('name, logo_url').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, [])

  if (profile?.logo_url) {
    return <img src={profile.logo_url} alt="Logo" style={{ height: '28px', objectFit: 'contain', maxWidth: '120px' }} />
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
      <span style={{ color: '#ffffff', fontSize: '15px', letterSpacing: '-0.3px', fontWeight: '500' }}>
        {profile?.name ?? 'Proposly'}
      </span>
    </div>
  )
}
