// Shared types for the Arwign Growth Agent suite

export type AgentKey =
  | 'sales' | 'email' | 'pinterest' | 'listing' | 'video'
  | 'ads' | 'seo' | 'support' | 'bundles' | 'trends' | 'analyst'

export type ActionType =
  | 'publish_pin' | 'update_listing' | 'send_campaign' | 'publish_post'
  | 'create_ad' | 'change_budget' | 'publish_article' | 'change_price'
  | 'create_bundle' | 'send_email' | 'publish_reel' | 'send_message'

export type AutonomyLevel = 'draft' | 'approve' | 'auto'

export interface AgentRecord {
  key: AgentKey
  name: string
  description: string
  phase: number
  enabled: boolean
  autonomy: Partial<Record<ActionType, AutonomyLevel>>
  schedule: string | null
  monthly_budget_usd: number
  budget_used_usd: number
  model: string | null
  last_run_at: string | null
  last_run_status: 'running' | 'completed' | 'failed' | 'skipped' | null
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: number
  agent_key: AgentKey
  trigger: 'cron' | 'event' | 'manual'
  started_at: string
  finished_at: string | null
  status: 'running' | 'completed' | 'failed' | 'skipped'
  summary: string | null
  tokens_in: number
  tokens_out: number
  cost_usd: number
  error: string | null
  prompt_version: number | null
}

export interface ApprovalRecord {
  id: number
  agent_key: AgentKey
  action_type: ActionType
  title: string
  preview: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'expired'
  decided_by: string | null
  decided_at: string | null
  feedback: string | null
  expires_at: string
  created_at: string
}

export interface BrandKit {
  id: 1
  voice_rules: string
  banned_phrases: string[]
  palette_tokens: Record<string, string>
  font_names: { heading: string; ui: string }
  approved_claims: string[]
  disclaimers: string
  uk_spelling_note: string
  updated_at: string
}

export interface IntegrationRecord {
  platform: string
  status: 'connected' | 'disconnected' | 'error' | 'expired'
  token_expires_at: string | null
  last_success_at: string | null
  scopes: string[]
  error_msg: string | null
  updated_at: string
}

export interface GlobalConfig {
  id: 1
  all_agents_paused: boolean
  updated_at: string
}

export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LlmCallOptions {
  agentKey: AgentKey
  runId?: number
  systemPrompt: string
  messages: LlmMessage[]
  maxTokens?: number
  temperature?: number
}

export interface LlmResult {
  content: string
  tokensIn: number
  tokensOut: number
  costUsd: number
}

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'email'
export type ContactKind = 'marketing' | 'transactional' | 'utility'

export interface ContactCheck {
  personId: string
  channel: Channel
  kind: ContactKind
  recipientTz?: string
}

export interface BudgetCheck {
  agentKey: AgentKey
  estimatedCostUsd: number
}
