import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import type { Locale } from '@/lib/email/types'

// Called by Vercel Cron (or Supabase pg_cron via HTTP) every 5–15 minutes.
// Protect with a shared secret so only the scheduler can invoke it.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const provider = getEmailProvider()
  let sent = 0
  let errors = 0

  // Claim rows that are due — FOR UPDATE SKIP LOCKED prevents duplicate sends in concurrent runs
  // We use a raw RPC call because the JS client doesn't expose SKIP LOCKED directly.
  const { data: dueRows, error: fetchErr } = await supabase.rpc('claim_due_sequence_rows', {
    batch_size: 50,
  })

  if (fetchErr) {
    console.error('[nurture] claim_due_sequence_rows failed:', fetchErr)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  for (const row of (dueRows ?? []) as NurtureRow[]) {
    try {
      // Bail if subscriber has unsubscribed/bounced since enrollment
      if (!['confirmed'].includes(row.subscriber_status)) {
        await supabase.from('subscriber_sequence_state')
          .update({ status: 'exited' })
          .eq('id', row.state_id)
        continue
      }

      const idempotencyKey = `${row.subscriber_id}:${row.sequence_id}:${row.current_step}`

      // Check if already sent (idempotency)
      const { data: existing } = await supabase
        .from('email_events')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single()

      if (!existing) {
        await provider.sendTransactional({
          to: row.email,
          locale: row.locale as Locale,
          templateKey: row.template_key,
          data: {
            ...(row.data_overrides ?? {}),
            unsub_token: row.unsub_token,
          },
          idempotencyKey,
          category: 'sales',
        })

        await supabase.from('email_events').insert({
          subscriber_id: row.subscriber_id,
          type: 'sent',
          idempotency_key: idempotencyKey,
          meta: { sequence_id: row.sequence_id, step: row.current_step },
        })

        sent++
      }

      // Advance the sequence
      const nextStep = row.current_step + 1
      const { data: nextStepRow } = await supabase
        .from('email_sequence_steps')
        .select('delay_hours')
        .eq('sequence_id', row.sequence_id)
        .eq('step_order', nextStep)
        .single()

      if (nextStepRow) {
        const nextSendAt = new Date(Date.now() + nextStepRow.delay_hours * 60 * 60_000).toISOString()
        await supabase.from('subscriber_sequence_state')
          .update({ current_step: nextStep, next_send_at: nextSendAt, status: 'active' })
          .eq('id', row.state_id)
      } else {
        // No more steps — mark completed
        await supabase.from('subscriber_sequence_state')
          .update({ status: 'completed' })
          .eq('id', row.state_id)
      }
    } catch (err) {
      console.error('[nurture] send failed for row', row.state_id, err)
      errors++
      // Release the row so it can be retried
      await supabase.from('subscriber_sequence_state')
        .update({ status: 'active' })
        .eq('id', row.state_id)
    }
  }

  return NextResponse.json({ sent, errors, processed: (dueRows ?? []).length })
}

// Also allow GET for manual trigger during development
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 405 })
  }
  return POST(req)
}

interface NurtureRow {
  state_id: string
  subscriber_id: string
  sequence_id: string
  current_step: number
  email: string
  locale: string
  subscriber_status: string
  template_key: string
  data_overrides: Record<string, unknown> | null
  unsub_token: string
}
