export default function LandingPage() {
  const bg = '#F5F0EB'
  const ink = '#1A1208'
  const mid = '#8C7B6B'
  const border = '#DDD5C8'
  const accent = '#C4A882'
  const cream = '#FAF7F3'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'sans-serif', color: ink }}>

      {/* Nav */}
      <nav style={{ padding: '0 64px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}`, background: bg, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '400', color: ink, letterSpacing: '-0.3px' }}>Proposly</span>
        <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          <a href="#como-funciona" style={{ fontSize: '13px', color: mid, textDecoration: 'none' }}>Cómo funciona</a>
          <a href="#precios" style={{ fontSize: '13px', color: mid, textDecoration: 'none' }}>Precios</a>
          <a href="/login" style={{ fontSize: '13px', color: mid, textDecoration: 'none' }}>Acceder</a>
          <a href="/login" style={{ fontSize: '13px', color: cream, background: ink, padding: '9px 22px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
            Empieza gratis
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '130px 48px 110px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: accent, marginBottom: '36px' }}>
          Para agencias y autónomos en España
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '76px', fontWeight: '400', color: ink, lineHeight: '1.05', letterSpacing: '-2.5px', margin: '0 0 36px' }}>
          Propuestas que<br />
          <em style={{ fontStyle: 'italic', color: mid }}>cierran ventas</em>
        </h1>
        <p style={{ fontSize: '19px', color: mid, lineHeight: '1.75', maxWidth: '520px', margin: '0 auto 52px' }}>
          Crea propuestas profesionales en minutos, envíalas como link y recibe la firma de tu cliente online.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
          <a href="/login" style={{ fontSize: '15px', color: cream, background: ink, padding: '15px 36px', borderRadius: '10px', textDecoration: 'none', fontWeight: '500', letterSpacing: '-0.2px' }}>
            Empieza gratis →
          </a>
          <a href="#como-funciona" style={{ fontSize: '15px', color: mid, padding: '15px 24px', textDecoration: 'none' }}>
            Ver cómo funciona
          </a>
        </div>
        <p style={{ fontSize: '12px', color: '#B8A898', marginTop: '22px' }}>Sin tarjeta de crédito · Gratis para siempre en el plan básico</p>
      </section>

      {/* Divisor */}
      <div style={{ borderTop: `1px solid ${border}`, maxWidth: '860px', margin: '0 auto' }} />

      {/* Tipos de cliente */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '52px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#B8A898', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '28px' }}>
          Usado por profesionales de toda España
        </p>
        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Agencias de marketing', 'Consultores', 'Fotógrafos', 'Diseñadores web', 'Empresas de reformas'].map(type => (
            <span key={type} style={{ fontSize: '15px', color: mid, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>{type}</span>
          ))}
        </div>
      </section>

      {/* Divisor */}
      <div style={{ borderTop: `1px solid ${border}`, maxWidth: '860px', margin: '0 auto' }} />

      {/* Cómo funciona */}
      <section id="como-funciona" style={{ maxWidth: '860px', margin: '0 auto', padding: '110px 48px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>El proceso</p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '52px', fontWeight: '400', color: ink, margin: '0 0 80px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
          Tres pasos,<br />ningún papel
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '56px' }}>
          {[
            { num: '01', title: 'Crea tu propuesta', desc: 'Elige una plantilla o empieza desde cero. Añade servicios, precios y tu branding en minutos.' },
            { num: '02', title: 'Envíala como link', desc: 'Tu cliente recibe un link, no un PDF. Lo abre desde cualquier dispositivo sin descargar nada.' },
            { num: '03', title: 'Recibe la firma', desc: 'El cliente acepta con un clic. Recibes un email al instante y la propuesta queda firmada.' },
          ].map(step => (
            <div key={step.num}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '52px', color: border, fontWeight: '400', margin: '0 0 28px', lineHeight: 1 }}>{step.num}</p>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '400', color: ink, margin: '0 0 14px' }}>{step.title}</h3>
              <p style={{ fontSize: '14px', color: mid, lineHeight: '1.75', margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divisor */}
      <div style={{ borderTop: `1px solid ${border}`, maxWidth: '860px', margin: '0 auto' }} />

      {/* Features */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '110px 48px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>Por qué Proposly</p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '52px', fontWeight: '400', color: ink, margin: '0 0 80px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
          Todo lo que necesitas,<br />nada de lo que no
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '52px 80px' }}>
          {[
            { title: 'Sabe cuándo lo abren', desc: 'Recibes una notificación en el momento en que tu cliente abre la propuesta. El momento perfecto para llamar.' },
            { title: 'Firma en un clic', desc: 'Sin imprimir, sin escanear, sin reenviar. Tu cliente acepta directamente desde el navegador.' },
            { title: 'Tu marca, no la nuestra', desc: 'Sube tu logo y personaliza cada propuesta con tus colores. El cliente ve tu agencia, no Proposly.' },
            { title: 'Plantillas propias', desc: 'Guarda tus servicios habituales como plantilla y crea nuevas propuestas en segundos.' },
            { title: 'Estadísticas reales', desc: 'Tasa de apertura, tasa de firma, importe cerrado. Sabe exactamente cómo va tu negocio.' },
            { title: 'En español, para España', desc: 'Precios en euros, soporte en español y pensado para cómo trabajan las agencias españolas.' },
          ].map(f => (
            <div key={f.title} style={{ borderTop: `1px solid ${border}`, paddingTop: '28px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '19px', fontWeight: '400', color: ink, margin: '0 0 12px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: mid, lineHeight: '1.75', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divisor */}
      <div style={{ borderTop: `1px solid ${border}`, maxWidth: '860px', margin: '0 auto' }} />

      {/* Precios */}
      <section id="precios" style={{ maxWidth: '860px', margin: '0 auto', padding: '110px 48px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>Precios</p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '52px', fontWeight: '400', color: ink, margin: '0 0 16px', letterSpacing: '-1.5px' }}>
          Simple y transparente
        </h2>
        <p style={{ fontSize: '16px', color: mid, margin: '0 0 64px' }}>Sin sorpresas. Cambia de plan cuando quieras.</p>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: cream, border: `1px solid ${border}`, borderRadius: '20px', padding: '44px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '11px', color: mid, margin: '0 0 28px', letterSpacing: '2px', textTransform: 'uppercase' }}>Gratis</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '56px', fontWeight: '400', color: ink, margin: '0 0 6px', letterSpacing: '-2px' }}>0€</p>
            <p style={{ fontSize: '13px', color: '#B8A898', margin: '0 0 36px' }}>para siempre</p>
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', flex: 1 }}>
              {['3 propuestas al mes', 'Link público único', 'Firma del cliente', 'Notificación de apertura'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: accent, fontSize: '16px', lineHeight: 1 }}>—</span>
                  <span style={{ fontSize: '14px', color: mid }}>{f}</span>
                </div>
              ))}
            </div>
            <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '13px', border: `1px solid ${border}`, borderRadius: '10px', fontSize: '14px', color: mid, textDecoration: 'none', background: bg }}>
              Empezar gratis
            </a>
          </div>

          <div style={{ background: ink, borderRadius: '20px', padding: '44px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: '22px', right: '22px', background: accent, color: ink, fontSize: '10px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Más popular
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 28px', letterSpacing: '2px', textTransform: 'uppercase' }}>Pro</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '56px', fontWeight: '400', color: '#FAF7F3', margin: '0 0 6px', letterSpacing: '-2px' }}>19€</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 36px' }}>al mes</p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', flex: 1 }}>
              {['Propuestas ilimitadas', 'Tu logo en cada propuesta', 'Plantillas personalizadas', 'Estadísticas avanzadas', 'Recordatorios automáticos', 'Soporte prioritario'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: accent, fontSize: '16px', lineHeight: 1 }}>—</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>{f}</span>
                </div>
              ))}
            </div>
            <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '13px', background: cream, borderRadius: '10px', fontSize: '14px', color: ink, textDecoration: 'none', fontWeight: '500' }}>
              Empezar con Pro
            </a>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: ink, padding: '110px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: accent, marginBottom: '32px' }}>
          Empieza hoy
        </p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '64px', fontWeight: '400', color: cream, margin: '0 0 28px', letterSpacing: '-2px', lineHeight: 1.05 }}>
          Tu próxima propuesta<br />
          <em style={{ color: 'rgba(250,247,243,0.35)', fontStyle: 'italic' }}>en cinco minutos</em>
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(250,247,243,0.45)', margin: '0 0 44px' }}>
          Sin tarjeta de crédito. Cancela cuando quieras.
        </p>
        <a href="/login" style={{ fontSize: '15px', color: ink, background: cream, padding: '15px 40px', borderRadius: '10px', textDecoration: 'none', fontWeight: '500' }}>
          Crear cuenta gratis →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: '36px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bg }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: ink }}>Proposly</span>
        <div style={{ display: 'flex', gap: '36px' }}>
          <a href="#como-funciona" style={{ fontSize: '13px', color: mid, textDecoration: 'none' }}>Cómo funciona</a>
          <a href="#precios" style={{ fontSize: '13px', color: mid, textDecoration: 'none' }}>Precios</a>
          <a href="/login" style={{ fontSize: '13px', color: mid, textDecoration: 'none' }}>Acceder</a>
        </div>
        <p style={{ fontSize: '12px', color: '#B8A898', margin: 0 }}>© 2025 Proposly</p>
      </footer>

    </div>
  )
}