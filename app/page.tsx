export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', backgroundColor: '#f8f7f4', color: '#0f0f0f', margin: 0, padding: 0 }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid #e0ddd6' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>Proposly</span>
        <a href="/login" style={{ backgroundColor: '#0f0f0f', color: '#f8f7f4', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}>
          Acceder
        </a>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 'bold', lineHeight: 1.1, maxWidth: '780px', margin: '0 auto 24px', letterSpacing: '-1px' }}>
          Propuestas comerciales que cierran ventas
        </h1>
        <p style={{ fontSize: '18px', color: '#555', maxWidth: '520px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Crea propuestas profesionales en minutos, envíalas con un enlace y recibe la firma del cliente online.
        </p>
        <a href="/login" style={{ backgroundColor: '#a8e063', color: '#0f0f0f', padding: '16px 40px', borderRadius: '10px', textDecoration: 'none', fontSize: '17px', fontWeight: 700, display: 'inline-block' }}>
          Empieza gratis →
        </a>
        <p style={{ marginTop: '16px', fontSize: '13px', color: '#888' }}>Sin tarjeta de crédito. Gratis para siempre en el plan básico.</p>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{ backgroundColor: '#fff', padding: '80px 24px' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', textAlign: 'center', marginBottom: '60px', letterSpacing: '-0.5px' }}>
          Cómo funciona
        </h2>
        <div style={{ display: 'flex', gap: '32px', maxWidth: '900px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { num: '1', title: 'Crea tu propuesta', desc: 'Elige una plantilla o empieza desde cero. Añade servicios, precios y tu branding en minutos.' },
            { num: '2', title: 'Envíala al cliente', desc: 'Comparte un enlace único. El cliente la abre desde cualquier dispositivo, sin apps ni cuentas.' },
            { num: '3', title: 'Recibe la firma', desc: 'El cliente acepta con un clic. Tú recibes un email de confirmación al instante.' },
          ].map((step) => (
            <div key={step.num} style={{ flex: '1 1 240px', backgroundColor: '#f8f7f4', borderRadius: '14px', padding: '36px 28px', textAlign: 'center', maxWidth: '280px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#a8e063', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'bold' }}>
                {step.num}
              </div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', marginBottom: '12px' }}>{step.title}</h3>
              <p style={{ color: '#555', lineHeight: 1.6, fontSize: '15px', margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRECIOS */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', marginBottom: '12px', letterSpacing: '-0.5px' }}>Precios simples</h2>
        <p style={{ color: '#555', fontSize: '16px', marginBottom: '56px' }}>Sin sorpresas. Cambia de plan cuando quieras.</p>
        <div style={{ display: 'flex', gap: '28px', maxWidth: '760px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* GRATIS */}
          <div style={{ flex: '1 1 300px', border: '2px solid #e0ddd6', borderRadius: '16px', padding: '40px 32px', backgroundColor: '#fff', maxWidth: '340px' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '8px' }}>Gratis</h3>
            <p style={{ fontSize: '42px', fontWeight: 'bold', margin: '16px 0 4px', fontFamily: 'Georgia, serif' }}>0 €</p>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>para siempre</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['3 propuestas al mes', 'Enlace público único', 'Firma digital del cliente', 'Notificación por email'].map((f) => (
                <li key={f} style={{ fontSize: '15px', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#a8e063', fontSize: '18px', fontWeight: 'bold' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '13px', border: '2px solid #0f0f0f', borderRadius: '8px', textDecoration: 'none', color: '#0f0f0f', fontWeight: 600, fontSize: '15px' }}>
              Empezar gratis
            </a>
          </div>

          {/* PRO */}
          <div style={{ flex: '1 1 300px', border: '2px solid #0f0f0f', borderRadius: '16px', padding: '40px 32px', backgroundColor: '#0f0f0f', color: '#f8f7f4', maxWidth: '340px', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#a8e063', color: '#0f0f0f', fontSize: '12px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
              MÁS POPULAR
            </span>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '8px', color: '#f8f7f4' }}>Pro</h3>
            <p style={{ fontSize: '42px', fontWeight: 'bold', margin: '16px 0 4px', fontFamily: 'Georgia, serif', color: '#a8e063' }}>19 €</p>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '32px' }}>al mes</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Propuestas ilimitadas', 'Plantillas personalizadas', 'Logo de tu agencia', 'Estadísticas de apertura', 'Soporte prioritario'].map((f) => (
                <li key={f} style={{ fontSize: '15px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#a8e063', fontSize: '18px', fontWeight: 'bold' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '13px', backgroundColor: '#a8e063', borderRadius: '8px', textDecoration: 'none', color: '#0f0f0f', fontWeight: 700, fontSize: '15px' }}>
              Empezar con Pro
            </a>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #e0ddd6', padding: '32px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 'bold' }}>Proposly</span>
        <span style={{ color: '#888', fontSize: '13px' }}>© {new Date().getFullYear()} Proposly. Todos los derechos reservados.</span>
      </footer>

    </main>
  )
}
