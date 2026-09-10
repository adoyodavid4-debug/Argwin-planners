'use client'
import TeamShell from '../TeamShell'
import MomentsManager from '@/components/calendar/MomentsManager'
import { type TeamWorkspace } from '@/lib/calendar/team'
import { type MomentsData } from '@/lib/calendar/moments'

export default function MomentsClient({ ws, moments }: { ws: TeamWorkspace; moments: MomentsData }) {
  return (
    <TeamShell workspace={ws} title="Moments & Memories"
      subtitle="Save the dates that matter and celebrate them — with you and the people you invite.">
      <MomentsManager initial={moments} />
    </TeamShell>
  )
}
