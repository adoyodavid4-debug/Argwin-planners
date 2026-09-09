import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarX } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import TeamBookingClient, { type PublicTeamPage } from './TeamBookingClient'

export const dynamic = 'force-dynamic'

async function getPage(teamId: string, slug: string): Promise<PublicTeamPage | null> {
  const supabase = createServiceRoleClient()
  const { data: page } = await supabase
    .from('team_booking_pages')
    .select('id, team_id, name, slug, type, member_ids, duration_min, description, active, timezone')
    .eq('team_id', teamId).eq('slug', slug).eq('active', true)
    .maybeSingle()
  if (!page) return null

  const { data: team } = await supabase.from('teams').select('name, timezone').eq('id', teamId).maybeSingle()
  const { data: members } = await supabase
    .from('team_members')
    .select('id, name, hue, status, user_id')
    .eq('team_id', teamId).in('id', page.member_ids ?? [])
  const hosts = (members ?? [])
    .filter((m: any) => m.status === 'active' && m.user_id)
    .map((m: any) => ({ id: m.id, name: m.name, hue: m.hue ?? 200 }))
  if (hosts.length === 0) return null

  return {
    teamId, slug: page.slug, name: page.name, type: page.type,
    duration_min: page.duration_min, description: page.description ?? null,
    teamName: team?.name ?? 'Team', timezone: page.timezone ?? team?.timezone ?? 'America/New_York',
    hosts,
  }
}

export async function generateMetadata({ params }: { params: { team: string; slug: string } }): Promise<Metadata> {
  const page = await getPage(params.team, params.slug)
  const title = page ? `Book — ${page.name} | Arwign Teams` : 'Booking not found | Arwign Teams'
  return { title, robots: { index: false, follow: false } }
}

export default async function TeamBookPage({ params }: { params: { team: string; slug: string } }) {
  const page = await getPage(params.team, params.slug)

  if (!page) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
            <CalendarX size={26} style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>This booking link isn’t available</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>The page may have been paused or the link is incorrect.</p>
          <Link href="/calendar" className="btn-outline">Back to Arwign Calendar</Link>
        </div>
      </div>
    )
  }

  return <TeamBookingClient page={page} />
}
