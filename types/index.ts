export type ProposalStatus = 'draft' | 'sent' | 'opened' | 'signed'

export type Service = {
  name: string
  price: number
  optional?: boolean
  selected?: boolean
}

export type TimelineItem = {
  id: string
  title: string
  description: string
  duration: string
}

export type Block =
  | { id: string; type: 'header'; content: string }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string; caption: string }
  | { id: string; type: 'separator' }
  | { id: string; type: 'services'; content: Service[] }
  | { id: string; type: 'timeline'; title: string; items: TimelineItem[] }

export type Proposal = {
  id: string
  public_token: string
  user_id: string
  title: string
  client_name: string
  client_email: string | null
  blocks: Block[]
  status: ProposalStatus
  total_amount: number | null
  expires_at: string | null
  opened_at?: string | null
  opened_count?: number | null
  signed_at?: string | null
  signer_name?: string | null
  sent_at?: string | null
  created_at?: string
  updated_at?: string
}

export type Profile = {
  user_id: string
  name: string | null
  logo_url: string | null
}

export type Template = {
  id: string
  user_id: string
  name: string
  blocks: Block[]
  icon?: string | null
  color?: string | null
  created_at?: string
}

export type Subscription = {
  id?: string
  user_id: string
  plan: 'free' | 'pro'
  status: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
}
