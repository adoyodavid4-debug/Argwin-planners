'use client'
import { Check, X } from 'lucide-react'
import { passwordChecks } from '@/lib/password'

// A live "password requirements" checklist. Renders nothing until the user has
// started typing, then shows each rule ticking green as it's satisfied.
export default function PasswordRequirements({ password, className }: { password: string; className?: string }) {
  if (!password) return null
  return (
    <ul className={`mt-2 space-y-1 ${className ?? ''}`}>
      {passwordChecks(password).map((c) => (
        <li key={c.label} className="flex items-center gap-1.5 text-[11px]"
          style={{ color: c.ok ? '#3f7a4e' : 'var(--text-muted)' }}>
          {c.ok ? <Check size={12} /> : <X size={12} style={{ opacity: 0.55 }} />}
          {c.label}
        </li>
      ))}
    </ul>
  )
}
