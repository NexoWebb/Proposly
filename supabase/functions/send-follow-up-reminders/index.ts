import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://proposly-kappa.vercel.app'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, title, client_name, client_email')
    .eq('status', 'sent')
    .is('opened_at', null)
    .is('reminder_sent_at', null)
    .lt('sent_at', threeDaysAgo)
    .not('client_email', 'is', null)

  if (error) {
    console.error('Error fetching proposals:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!proposals || proposals.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')!
  let sent = 0
  const errors: string[] = []

  for (const proposal of proposals) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
          <div style="width:6px;height:6px;border-radius:50%;background:#a8e063"></div>
          <span style="font-size:14px;font-weight:500">Proposly</span>
        </div>
        <h1 style="font-size:20px;font-weight:400;margin:0 0 8px;font-family:Georgia,serif">
          Hola, ${proposal.client_name}
        </h1>
        <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px">
          Hace unos días te enviamos la propuesta <strong>${proposal.title}</strong> y queríamos
          asegurarnos de que te llegó bien.
        </p>
        <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px">
          Si aún no has tenido ocasión de revisarla, la tienes disponible en el siguiente enlace.
          Estamos a tu disposición para resolver cualquier duda.
        </p>
        <a href="${APP_URL}/p/${proposal.id}"
          style="display:inline-block;background:#0f0f0f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
          Ver propuesta →
        </a>
        <p style="color:#bbb;font-size:12px;margin-top:32px">
          Si ya has tomado una decisión o necesitas algo, no dudes en responder a este email.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Proposly <onboarding@resend.dev>',
        to: proposal.client_email,
        subject: '¿Has tenido oportunidad de revisar nuestra propuesta?',
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      errors.push(`${proposal.id}: ${body}`)
      continue
    }

    await supabase
      .from('proposals')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', proposal.id)

    sent++
  }

  return new Response(
    JSON.stringify({ sent, errors: errors.length ? errors : undefined }),
    { status: 200 },
  )
})
