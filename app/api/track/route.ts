import { trackProposal } from '@/lib/trackProposal'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { public_token } = await request.json()

  if (!public_token) return new NextResponse(null, { status: 204 })

  await trackProposal(public_token).catch(() => {})

  return new NextResponse(null, { status: 204 })
}
