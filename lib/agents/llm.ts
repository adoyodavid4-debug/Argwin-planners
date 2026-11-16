// LLM gateway for all Arwign growth agents.
// Wraps the Anthropic Messages API; records token usage + cost to ag_runs;
// enforces per-agent monthly budget caps.
// Uses fetch directly — no SDK dependency required.
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AgentKey, LlmCallOptions, LlmResult } from './types'

// Pricing per million tokens (claude-sonnet-4-5 defaults; override via env)
const COST_PER_M_IN  = 3.00   // USD
const COST_PER_M_OUT = 15.00  // USD

const MODEL_HIGH = process.env.ANTHROPIC_MODEL_HIGH ?? 'claude-sonnet-4-6'
const MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5-20251001'

export function modelFor(agentKey: AgentKey): string {
  const fastAgents: AgentKey[] = ['email', 'pinterest', 'support', 'trends']
  return fastAgents.includes(agentKey) ? MODEL_FAST : MODEL_HIGH
}

function costUsd(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * COST_PER_M_IN
       + (tokensOut / 1_000_000) * COST_PER_M_OUT
}

// Load the brand kit once per cold start (edge/serverless)
let brandKitCache: string | null = null
async function getBrandKitPrompt(): Promise<string> {
  if (brandKitCache) return brandKitCache
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('ag_brand_kit').select('*').single()
  if (!data) return ''
  brandKitCache = [
    '## Brand kit',
    `Voice: ${data.voice_rules}`,
    `Spelling: ${data.uk_spelling_note}`,
    `Banned phrases: ${(data.banned_phrases as string[]).join(', ')}`,
    `Palette: ${JSON.stringify(data.palette_tokens)}`,
    `Fonts: heading=${(data.font_names as { heading: string }).heading}, ui=${(data.font_names as { ui: string }).ui}`,
    data.approved_claims?.length ? `Approved claims: ${(data.approved_claims as string[]).join('; ')}` : '',
    data.disclaimers ? `Disclaimer: ${data.disclaimers}` : '',
  ].filter(Boolean).join('\n')
  return brandKitCache
}

/** Call the Anthropic Messages API and return the assistant's reply. */
export async function callLlm(opts: LlmCallOptions): Promise<LlmResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  if (process.env.AGENTS_DRY_RUN === 'true') {
    return { content: '[DRY RUN — no LLM call made]', tokensIn: 0, tokensOut: 0, costUsd: 0 }
  }

  // Enforce budget before the call
  const supabase = createServiceRoleClient()
  const { data: agent } = await supabase
    .from('ag_agents')
    .select('monthly_budget_usd, budget_used_usd')
    .eq('key', opts.agentKey)
    .single()

  if (agent && agent.monthly_budget_usd > 0 && agent.budget_used_usd >= agent.monthly_budget_usd) {
    throw new Error(`Agent ${opts.agentKey} has reached its monthly budget of $${agent.monthly_budget_usd}`)
  }

  const brandKit = await getBrandKitPrompt()
  const systemPrompt = [opts.systemPrompt, brandKit].filter(Boolean).join('\n\n')
  const model = opts.agentKey ? modelFor(opts.agentKey) : MODEL_FAST

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      system: systemPrompt,
      messages: opts.messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const json = await response.json() as {
    content: Array<{ type: string; text: string }>
    usage: { input_tokens: number; output_tokens: number }
  }

  const content   = json.content.find(b => b.type === 'text')?.text ?? ''
  const tokensIn  = json.usage.input_tokens
  const tokensOut = json.usage.output_tokens
  const cost      = costUsd(tokensIn, tokensOut)

  // Record usage (best-effort direct update; runs don't overlap per agent)
  if (opts.runId) {
    await supabase
      .from('ag_runs')
      .update({ tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: cost })
      .eq('id', opts.runId)
  }
  if (agent) {
    await supabase
      .from('ag_agents')
      .update({ budget_used_usd: (agent.budget_used_usd ?? 0) + cost })
      .eq('key', opts.agentKey)
  }

  return { content, tokensIn, tokensOut, costUsd: cost }
}

/** Invalidate the brand kit cache (call after ag_brand_kit is updated). */
export function invalidateBrandKitCache() {
  brandKitCache = null
}
