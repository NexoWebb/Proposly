import { trackProposal } from '@/lib/trackProposal'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { publicToken } = await request.json()

  if (!publicToken) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  await trackProposal(publicToken)

  return NextResponse.json({ ok: true })
}
