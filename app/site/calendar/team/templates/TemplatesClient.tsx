'use client'
import TeamShell from '../TeamShell'
import TemplatesManager from '@/components/calendar/TemplatesManager'
import { type TeamWorkspace } from '@/lib/calendar/team'
import { type TemplatesData } from '@/lib/calendar/templates'

export default function TemplatesClient({ ws, templates }: { ws: TeamWorkspace; templates: TemplatesData }) {
  return (
    <TeamShell workspace={ws} title="Event Templates"
      subtitle="Reusable blueprints for the meetings your team sets up again and again.">
      <TemplatesManager initial={templates} />
    </TeamShell>
  )
}
