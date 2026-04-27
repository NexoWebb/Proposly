import EditorEdit from './EditorEdit'
import UserLogo from '@/components/UserLogo'

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
        <div style={{ margin: '0 auto' }}>
          <UserLogo />
        </div>
        <div style={{ width: '80px' }} />
      </div>
      <EditorEdit id={id} />
    </div>
  )
}
