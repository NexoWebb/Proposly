export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <p style={{ fontSize: '48px', margin: '0 0 24px', lineHeight: 1 }}>🔍</p>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1A1208', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
          Propuesta no encontrada
        </h1>
        <p style={{ fontSize: '14px', color: '#8C7B6B', margin: 0, lineHeight: '1.6' }}>
          El enlace puede ser incorrecto o la propuesta ha sido eliminada.
        </p>
      </div>
    </div>
  )
}
