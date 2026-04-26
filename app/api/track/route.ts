import { trackProposal } from '@/lib/trackProposal'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { id } = await request.json()

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  await trackProposal(id)

  return NextResponse.json({ ok: true })
}
