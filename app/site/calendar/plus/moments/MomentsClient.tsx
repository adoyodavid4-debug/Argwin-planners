'use client'
import PlusShell from '../PlusShell'
import MomentsManager from '@/components/calendar/MomentsManager'
import { type PlusWorkspace } from '@/lib/calendar/plus'
import { type MomentsData } from '@/lib/calendar/moments'

export default function MomentsClient({ ws, moments }: { ws: PlusWorkspace; moments: MomentsData }) {
  return (
    <PlusShell workspace={ws} title="Moments & Memories"
      subtitle="Save the dates that matter and celebrate them — with you and the people you invite.">
      <MomentsManager initial={moments} />
    </PlusShell>
  )
}
