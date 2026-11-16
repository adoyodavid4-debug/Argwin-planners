// Agent module registry. Every agent implements plan/act/report
// (masterplan §3.2) and is dispatched by the cron route through runAgent.
import type { AgentKey } from '../types'
import type { RunContext } from '../runner'

export interface AgentModule {
  key: AgentKey
  /** Gather inputs, call the LLM, create drafts/approvals/tasks. */
  plan(ctx: RunContext): Promise<void>
  /** Execute approved items (publish, schedule, apply). */
  act(ctx: RunContext): Promise<void>
  /** Write KPI snapshots and health info. */
  report(ctx: RunContext): Promise<void>
}

import { emailModule } from './email'
import { pinterestModule } from './pinterest'
import { listingModule } from './listing'
import { videoModule } from './video'
import { adsModule } from './ads'
import { seoModule } from './seo'
import { supportModule } from './support'
import { bundlesModule } from './bundles'
import { trendsModule } from './trends'
import { analystModule } from './analyst'

export const MODULES: Partial<Record<AgentKey, AgentModule>> = {
  email:     emailModule,
  pinterest: pinterestModule,
  listing:   listingModule,
  video:     videoModule,
  ads:       adsModule,
  seo:       seoModule,
  support:   supportModule,
  bundles:   bundlesModule,
  trends:    trendsModule,
  analyst:   analystModule,
  // 'sales' is event-driven (webhook + pacing engine), not a plan/act/report module
}
