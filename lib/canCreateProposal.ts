import { supabaseAdmin } from '@/lib/supabaseAdmin'

// TODO (prompt 2.2 — RLS audit): gate POST /api/proposals with this helper
// once the editor routes create proposals through the API instead of directly via Supabase client.
export async function canCreateProposal(userId: string): Promise<{
  can: boolean
  count: number
  plan: 'free' | 'pro'
}> {
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single()

  const plan = (sub?.plan ?? 'free') as 'free' | 'pro'

  if (plan === 'pro') return { can: true, count: 0, plan: 'pro' }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString())

  const n = count ?? 0
  return { can: n < 3, count: n, plan: 'free' }
}
