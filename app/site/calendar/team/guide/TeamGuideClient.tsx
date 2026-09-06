'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Building2, Users, CalendarDays, DoorOpen, Globe2, Link2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react'
import TeamShell, { SectionCard } from '../TeamShell'
import { type TeamWorkspace } from '@/lib/calendar/team'

export default function TeamGuideClient({ ws }: { ws: TeamWorkspace }) {
  return (
    <TeamShell workspace={ws} title="How to use & integrate"
      subtitle="Set up your team and put every Arwign Teams capability to work — step by step.">

      <div className="grid gap-6 lg:grid-cols-2">
        <Guide icon={Building2} title="1 · Set up your team" cta={{ href: '/calendar/team', label: 'Team overview' }}>
          <Step>On the <b>Overview</b>, name your team and confirm your <b>seats</b> — the number of people who can join.</Step>
          <Step>Set the team’s <b>time zone</b> and billing email in the <b>Admin console</b>.</Step>
          <Step>Everything in <b>Arwign Plus</b> (sync, AI, briefings, booking) is included for every member.</Step>
        </Guide>

        <Guide icon={Users} title="2 · Invite members & assign roles" cta={{ href: '/calendar/team/members', label: 'Members & roles' }}>
          <Step>Go to <b>Members &amp; roles</b> → <b>Invite</b> by email. They get an invite and appear as “invited” until they join.</Step>
          <Step>Assign a role: <b>Viewer</b> (read-only), <b>Contributor</b> (propose), <b>Editor</b> (create/edit), <b>Manager</b> (invite, approve, manage), <b>Owner</b> (billing &amp; the team).</Step>
          <Step>Change a person’s role anytime — every change is written to the audit log.</Step>
        </Guide>

        <Guide icon={CalendarDays} title="3 · Shared calendars" cta={{ href: '/calendar/team/calendars', label: 'Shared calendars' }}>
          <Step>Create a shared calendar (e.g. <i>Company-wide</i>, <i>Product &amp; Eng</i>) and add the members who should see it.</Step>
          <Step>Choose visibility — <b>Busy</b> (free/busy only) or <b>Full</b> (event details) — per calendar.</Step>
          <Step>Editors and above can add events directly; Contributors can propose them for approval.</Step>
        </Guide>

        <Guide icon={DoorOpen} title="4 · Rooms & resources" cta={{ href: '/calendar/team/resources', label: 'Rooms & resources' }}>
          <Step>Add <b>rooms, desks, equipment or vehicles</b> with capacity and location.</Step>
          <Step>Turn on <b>requires approval</b> for anything sensitive (e.g. the boardroom).</Step>
          <Step>Members <b>request</b> a resource; Managers <b>approve or decline</b> from the queue — no double-booking.</Step>
        </Guide>

        <Guide icon={Globe2} title="5 · Availability finder" cta={{ href: '/calendar/team/availability', label: 'Availability finder' }}>
          <Step>Pick the people you need and a duration; Arwign finds the <b>overlapping free slots</b> across their calendars.</Step>
          <Step>It’s <b>time-zone correct</b> — see each person’s local time and avoid the “that’s 6am for them” mistakes.</Step>
          <Step>Book the winning slot straight into a shared calendar.</Step>
        </Guide>

        <Guide icon={Link2} title="6 · Team booking pages" cta={{ href: '/calendar/team/booking', label: 'Booking pages' }}>
          <Step><b>Round-robin</b> — distribute incoming bookings evenly across a team (e.g. Sales).</Step>
          <Step><b>Collective</b> — only offer times when everyone required is free (e.g. interviews).</Step>
          <Step><b>Group</b> — many attendees into one slot (e.g. office hours). Share one link; Arwign handles the rest.</Step>
        </Guide>

        <Guide icon={ShieldCheck} title="7 · Delegation & audit" cta={{ href: '/calendar/team/audit', label: 'Delegation & audit' }}>
          <Step><b>Delegate</b> a calendar so an assistant or teammate can accept, decline and schedule on someone’s behalf.</Step>
          <Step>Every shared and delegated action is recorded in the <b>audit log</b> — who did what, and when.</Step>
          <Step>Manage seats, roles and centralised billing from the <b>Admin console</b>.</Step>
        </Guide>

        <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.06)' }}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={16} style={{ color: 'var(--gold)' }} />
            <h3 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Plus for every member</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Each teammate also gets the full <b>Arwign Plus</b> experience — Google/Outlook sync, the Daily Outlook Briefing,
            AI scheduling and personal booking pages.
          </p>
          <Link href="/calendar/plus/guide" className="btn-outline mt-3 inline-flex px-4 py-2 text-sm">Read the Plus guide <ArrowRight size={14} /></Link>
        </div>
      </div>
    </TeamShell>
  )
}

function Guide({ icon: Icon, title, cta, children }: { icon: typeof Users; title: string; cta?: { href: string; label: string }; children: ReactNode }) {
  return (
    <SectionCard title={title} action={cta ? <Link href={cta.href} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{cta.label} →</Link> : undefined}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
        <Icon size={18} style={{ color: 'var(--gold)' }} />
      </div>
      <ol className="space-y-2.5">{children}</ol>
    </SectionCard>
  )
}
function Step({ children }: { children: ReactNode }) {
  return <li className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--gold)' }} />
    <span>{children}</span>
  </li>
}
