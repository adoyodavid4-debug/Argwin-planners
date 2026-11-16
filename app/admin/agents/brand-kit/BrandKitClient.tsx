'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import type { BrandKit } from '@/lib/agents/types'

interface Props { brandKit: BrandKit | null }

export default function BrandKitClient({ brandKit }: Props) {
  const [voiceRules,     setVoiceRules]     = useState(brandKit?.voice_rules ?? '')
  const [spellingNote,   setSpellingNote]   = useState(brandKit?.uk_spelling_note ?? '')
  const [disclaimers,    setDisclaimers]    = useState(brandKit?.disclaimers ?? '')
  const [bannedText,     setBannedText]     = useState((brandKit?.banned_phrases ?? []).join('\n'))
  const [claimsText,     setClaimsText]     = useState((brandKit?.approved_claims ?? []).join('\n'))
  const [pending, startTransition]          = useTransition()

  const save = () => {
    startTransition(async () => {
      const res = await fetch('/api/admin/agents/brand-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_rules:     voiceRules,
          uk_spelling_note: spellingNote,
          disclaimers,
          banned_phrases:  bannedText.split('\n').map(s => s.trim()).filter(Boolean),
          approved_claims: claimsText.split('\n').map(s => s.trim()).filter(Boolean),
        }),
      })
      if (res.ok) toast.success('Brand kit saved')
      else toast.error('Failed to save')
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Brand Kit</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Every agent loads this into its system prompt before writing any copy.
        </p>
      </div>

      <Card title="Voice & tone">
        <label className="label-xs">Voice rules</label>
        <textarea
          value={voiceRules}
          onChange={e => setVoiceRules(e.target.value)}
          rows={5}
          className="textarea-field w-full"
          placeholder="Describe the brand voice all agents should use…"
        />
      </Card>

      <Card title="Spelling & language">
        <label className="label-xs">UK spelling rule</label>
        <textarea
          value={spellingNote}
          onChange={e => setSpellingNote(e.target.value)}
          rows={3}
          className="textarea-field w-full"
        />
      </Card>

      <Card title="Banned phrases">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          One phrase per line. Agents will never write these.
        </p>
        <textarea
          value={bannedText}
          onChange={e => setBannedText(e.target.value)}
          rows={6}
          className="textarea-field w-full font-mono"
          placeholder={'only 3 left\nlimited time offer\n100% guaranteed'}
        />
      </Card>

      <Card title="Approved claims">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          Factual claims agents may make about Arwign planners. One per line.
        </p>
        <textarea
          value={claimsText}
          onChange={e => setClaimsText(e.target.value)}
          rows={5}
          className="textarea-field w-full font-mono"
          placeholder={'Compatible with GoodNotes 6 and Notability\nAll planners include hyperlinked tabs'}
        />
      </Card>

      <Card title="Disclaimers">
        <label className="label-xs">Legal / marketing disclaimers</label>
        <textarea
          value={disclaimers}
          onChange={e => setDisclaimers(e.target.value)}
          rows={3}
          className="textarea-field w-full"
          placeholder="e.g. Digital download — no physical product will be shipped."
        />
      </Card>

      <div
        className="p-4 rounded-xl border text-xs"
        style={{ background: 'rgba(201,168,76,0.08)', borderColor: 'var(--border-gold)', color: 'var(--text-secondary)' }}
      >
        <strong>Palette</strong>: cream #F5F0E8 · gold #C9A84C · clay #C9847C · sage #6E7E66 · parchment #EDE8DC
        &nbsp;·&nbsp;
        <strong>Fonts</strong>: Lora (headings) · Poppins (UI)
        <br />
        These are defined in the stylesheet and cannot be changed here.
      </div>

      <button onClick={save} disabled={pending} className="btn-primary">
        {pending ? 'Saving…' : 'Save brand kit'}
      </button>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  )
}
