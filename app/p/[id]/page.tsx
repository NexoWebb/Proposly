import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

type Service = {
  name: string
  price: number
}

type Block = {
  type: string
  content: string | Service[]
}

export default async function ProposalPublicPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !proposal) notFound()

  const introBlock = proposal.blocks?.find((b: Block) => b.type === 'intro')
  const servicesBlock = proposal.blocks?.find((b: Block) => b.type === 'services')
  const services: Service[] = servicesBlock?.content || []
  const total = services.reduce((sum, s) => sum + Number(s.price), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: "'Georgia', serif" }}>

      {/* Hero */}
      <div style={{ background: '#0f0f0f', padding: '64px 24px 48px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a8e063' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Propuesta comercial
            </span>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '400', margin: '0 0 12px', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
            {proposal.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0, fontFamily: 'sans-serif' }}>
            Preparada para {proposal.client_name}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Intro */}
        {introBlock?.content && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '16px' }}>
              Introducción
            </p>
            <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.8', margin: 0, fontStyle: 'italic' }}>
              {introBlock.content as string}
            </p>
          </div>
        )}

        {/* Divisor */}
        <div style={{ height: '1px', background: '#e8e5e0', margin: '32px 0' }} />

        {/* Servicios */}
        {services.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '20px' }}>
              Servicios incluidos
            </p>
            <div>
              {services.map((service, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid #eee'
                }}>
                  <span style={{ fontSize: '15px', color: '#222', fontFamily: 'sans-serif' }}>{service.name}</span>
                  <span style={{ fontSize: '15px', color: '#222', fontWeight: '500', fontFamily: 'sans-serif' }}>
                    {Number(service.price).toLocaleString('es-ES')}€
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              background: '#0f0f0f',
              borderRadius: '12px',
              marginTop: '20px'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'sans-serif' }}>Total sin IVA</span>
              <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '400', letterSpacing: '-0.5px' }}>
                {total.toLocaleString('es-ES')}€
              </span>
            </div>
          </div>
        )}

        {/* Divisor */}
        <div style={{ height: '1px', background: '#e8e5e0', margin: '32px 0' }} />

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '20px', fontFamily: 'sans-serif' }}>
            ¿Todo correcto? Acepta con un clic, sin descargar nada.
          </p>
          <button style={{
            width: '100%',
            background: '#0f0f0f',
            color: '#ffffff',
            border: 'none',
            padding: '16px',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: 'sans-serif',
            cursor: 'pointer',
            letterSpacing: '0.2px'
          }}>
            Aceptar esta propuesta →
          </button>
          <p style={{ fontSize: '12px', color: '#bbb', marginTop: '12px', fontFamily: 'sans-serif' }}>
            Recibiréis una copia por email al aceptar
          </p>
        </div>

      </div>
    </div>
  )
}