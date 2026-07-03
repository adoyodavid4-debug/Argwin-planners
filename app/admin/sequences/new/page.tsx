import type { Metadata } from 'next'
import SequenceForm from '../SequenceForm'

export const metadata: Metadata = {
  title: 'New Sequence — Admin',
  robots: { index: false, follow: false },
}

export default function NewSequencePage() {
  return <SequenceForm />
}
