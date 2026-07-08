import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'

const FREEBIE_EXPIRY_HOURS = 72

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/free?error=invalid', req.url))
  }

  const supabase = createServiceRoleClient()

  // Look up subscriber by token
  const { data: sub, error } = await supabase
    .from('subscribers')
    .select('id, email, locale, status, optin_token_expires_at, source_lead_magnet_id, unsub_token')
    .eq('optin_token', token)
    .single()

  if (error || !sub) {
    return NextResponse.redirect(new URL('/free?error=invalid', req.url))
  }

  if (sub.status === 'confirmed') {
    // Already confirmed — just redirect to success
    return NextResponse.redirect(new URL(`/free/confirmed?resend=true`, req.url))
  }

  if (sub.optin_token_expires_at && new Date(sub.optin_token_expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/free?error=expired', req.url))
  }

  // Mark confirmed, clear token
  await supabase
    .from('subscribers')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), optin_token: null, optin_token_expires_at: null })
    .eq('id', sub.id)

  let downloadUrl: string | null = null

  // Issue signed freebie download URL if they came from a lead magnet
  if (sub.source_lead_magnet_id) {
    const { data: lm } = await supabase
      .from('lead_magnets')
      .select('asset_path, title_i18n')
      .eq('id', sub.source_lead_magnet_id)
      .single()

    if (lm?.asset_path) {
      const expiresAt = new Date(Date.now() + FREEBIE_EXPIRY_HOURS * 60 * 60_000)
      const { data: signedData } = await supabase.storage
        .from('freebies')
        .createSignedUrl(lm.asset_path, FREEBIE_EXPIRY_HOURS * 3600)

      downloadUrl = signedData?.signedUrl ?? null

      if (downloadUrl) {
        // Record the delivery
        await supabase.from('freebie_deliveries').insert({
          subscriber_id: sub.id,
          lead_magnet_id: sub.source_lead_magnet_id,
          expires_at: expiresAt.toISOString(),
        })

        const magnetTitle = (lm.title_i18n as Record<string, string>)[sub.locale] ?? lm.title_i18n['en']

        // Send delivery email
        try {
          const provider = getEmailProvider()
          await provider.sendTransactional({
            to: sub.email,
            locale: sub.locale as 'en' | 'fr',
            templateKey: 'optin.delivery',
            data: {
              download_url: downloadUrl,
              magnet_title: magnetTitle,
              expires_at: expiresAt.toLocaleDateString(sub.locale === 'fr' ? 'fr-FR' : 'en-US'),
              unsub_token: sub.unsub_token,
            },
            idempotencyKey: `${sub.id}:delivery:${sub.source_lead_magnet_id}`,
            category: 'sales',
          })
        } catch (err) {
          console.error('[confirm] delivery email failed:', err)
        }

        // Enroll in the lead magnet's nurture sequence
        const { data: lmFull } = await supabase
          .from('lead_magnets')
          .select('enroll_sequence_id')
          .eq('id', sub.source_lead_magnet_id)
          .single()

        if (lmFull?.enroll_sequence_id) {
          const { data: seq } = await supabase
            .from('email_sequences')
            .select('id')
            .eq('id', lmFull.enroll_sequence_id)
            .eq('is_active', true)
            .single()

          if (seq) {
            // Get the first step's delay
            const { data: firstStep } = await supabase
              .from('email_sequence_steps')
              .select('delay_hours')
              .eq('sequence_id', seq.id)
              .order('step_order', { ascending: true })
              .limit(1)
              .single()

            const delayHours = firstStep?.delay_hours ?? 0
            const nextSendAt = new Date(Date.now() + delayHours * 60 * 60_000).toISOString()

            await supabase.from('subscriber_sequence_state').upsert({
              subscriber_id: sub.id,
              sequence_id: seq.id,
              current_step: 0,
              next_send_at: nextSendAt,
              status: 'active',
            }, { onConflict: 'subscriber_id,sequence_id', ignoreDuplicates: true })
          }
        }
      }
    }
  }

  // Also sync to ESP contact list
  try {
    const provider = getEmailProvider()
    await provider.upsertContact({
      email: sub.email,
      attributes: { locale: sub.locale },
      tags: ['confirmed'],
      consent: { at: new Date().toISOString(), source: 'optin-form' },
    })
  } catch (err) {
    console.error('[confirm] upsertContact failed:', err)
  }

  const redirectUrl = new URL('/free/confirmed', req.url)
  if (downloadUrl) redirectUrl.searchParams.set('download', encodeURIComponent(downloadUrl))
  return NextResponse.redirect(redirectUrl)
}
