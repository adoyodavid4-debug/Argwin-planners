'use client'
import PlusShell from '../PlusShell'
import TemplatesManager from '@/components/calendar/TemplatesManager'
import { type PlusWorkspace } from '@/lib/calendar/plus'
import { type TemplatesData } from '@/lib/calendar/templates'

export default function TemplatesClient({ ws, templates }: { ws: PlusWorkspace; templates: TemplatesData }) {
  return (
    <PlusShell workspace={ws} title="Event Templates"
      subtitle="Reusable blueprints for the meetings you set up again and again.">
      <TemplatesManager initial={templates} />
    </PlusShell>
  )
}
