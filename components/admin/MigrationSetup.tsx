'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, RefreshCw } from 'lucide-react'

interface Props {
  migrationFile: string
  sql: string
  supabaseUrl: string
}

export default function MigrationSetup({ migrationFile, sql, supabaseUrl }: Props) {
  const [copied, setCopied] = useState(false)

  // Derive the Supabase SQL editor URL from the project URL
  // e.g. https://abcxyz.supabase.co  →  project ref = "abcxyz"
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  const sqlEditorUrl = `https://app.supabase.com/project/${projectRef}/sql/new`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(224,168,44,0.12)' }}>
            <span style={{ color: 'var(--gold)', fontSize: 18 }}>⚙</span>
          </div>
          <div>
            <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
              Database setup required
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The funnel tables (<code className="font-mono text-xs px-1 py-0.5 rounded"
                style={{ background: 'var(--bg-secondary)' }}>lead_magnets</code>,{' '}
              <code className="font-mono text-xs px-1 py-0.5 rounded"
                style={{ background: 'var(--bg-secondary)' }}>email_sequences</code>,{' '}
              <code className="font-mono text-xs px-1 py-0.5 rounded"
                style={{ background: 'var(--bg-secondary)' }}>subscribers</code>) don&apos;t exist yet.
              Run the migration below in the Supabase SQL editor to enable this feature.
            </p>
          </div>
        </div>

        {/* Steps */}
        <ol className="mt-5 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {[
            <>Copy the SQL below</>,
            <>Click <strong>Open SQL Editor</strong> to open your Supabase project</>,
            <>Paste and click <strong>Run</strong></>,
            <>Come back and click <strong>Reload</strong></>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(224,168,44,0.15)', color: 'var(--gold)' }}>
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)' }}
          >
            <ExternalLink size={14} />
            Open SQL Editor
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}
          >
            {copied ? <Check size={14} style={{ color: 'var(--gold)' }} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy SQL'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
          >
            <RefreshCw size={14} />
            Reload
          </button>
        </div>
      </div>

      {/* SQL block */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {migrationFile}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: copied ? 'var(--gold)' : 'var(--text-muted)' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 text-xs leading-relaxed overflow-x-auto scrollbar-thin"
          style={{ background: '#1a1a2e', color: '#e2e8f0', fontFamily: 'var(--font-mono, monospace)', maxHeight: 420 }}>
          <code>{sql}</code>
        </pre>
      </div>
    </div>
  )
}
