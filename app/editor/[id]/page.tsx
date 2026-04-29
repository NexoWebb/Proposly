import EditorEdit from './EditorEdit'
import UserLogo from '@/components/UserLogo'

const pageBg = '#D6E8F5'
const topbar = '#4A7FA5'

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: topbar, padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0, boxShadow: '0 2px 16px rgba(74,127,165,0.2)' }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none' }}>
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