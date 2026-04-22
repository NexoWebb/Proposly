'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Proposal = {
  id: string
  title: string
  client_name: string
  status: string
  total_amount: number
  created_at: string
}

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  opened: 'Abierta',
  signed: 'Firmada',
}

const statusColor: Record<string, string> = {
  draft: '#999',
  sent: '#3b82f6',
  opened: '#f59e0b',
  signed: '#22c55e',
}

export default function DashboardPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProposals = async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setProposals(data)
      setLoading(false)
    }
    fetchProposals()
  }, [])

  const stats = [
    { label: 'Total', value: proposals.length },
    { label: 'Enviadas', value: proposals.filter(p => p.status === 'sent').length },
    { label: 'Abiertas', value: proposals.filter(p => p.status === 'opened').length },
    { label: 'Firmadas', value: proposals.filter(p => p.status === 'signed').length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'sans-serif' }}>

      {/* Topbar */}
      <div style={{ background: '#0f0f0f', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a8e063' }} />
          <span style={{ color: '#ffffff', fontSize: '15px', letterSpacing: '-0.3px' }}>Proposly</span>
        </div>
        <button
          onClick={() => window.location.href = '/editor'}
          style={{ background: '#ffffff', color: '#0f0f0f', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          + Nueva propuesta
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Título */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#0f0f0f', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
            Tus propuestas
          </h1>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
            Gestiona y haz seguimiento de todas tus propuestas
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '40px' }}>
          {stats.map(stat => (
            <div key={stat.label} style={{ background: '#ffffff', border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '11px', color: '#999', margin: '0 0 8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '28px', fontWeight: '400', color: '#0f0f0f', margin: 0, fontFamily: 'Georgia, serif' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div style={{ background: '#ffffff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <p style={{ fontSize: '11px', color: '#999', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Propuestas recientes
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
              Cargando...
            </div>
          ) : proposals.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
                Todavía no tienes propuestas
              </p>
              <button
                onClick={() => window.location.href = '/editor'}
                style={{ background: '#0f0f0f', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
              >
                Crear primera propuesta
              </button>
            </div>
          ) : (
            proposals.map((proposal, index) => (
              <div
                key={proposal.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: index < proposals.length - 1 ? '1px solid #f5f5f5' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onClick={() => window.location.href = `/p/${proposal.id}`}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Icono */}
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px' }}>📄</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#0f0f0f', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proposal.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                    {proposal.client_name}
                  </p>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[proposal.status] }} />
                  <span style={{ fontSize: '12px', color: '#666' }}>{statusLabel[proposal.status]}</span>
                </div>

                {/* Importe */}
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f0f0f', minWidth: '70px', textAlign: 'right' }}>
                  {Number(proposal.total_amount).toLocaleString('es-ES')}€
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}