import EditorEdit from './EditorEdit'

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1C2B5E', padding: '0 40px', display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0 }}>
        <a
          href="/dashboard"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Dashboard
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6EE7B7' }} />
          <span style={{ color: '#ffffff', fontSize: '15px', letterSpacing: '-0.3px', fontWeight: '500' }}>Proposly</span>
        </div>
        <div style={{ width: '80px' }} />
      </div>
      <EditorEdit id={id} />
    </div>
  )
}
