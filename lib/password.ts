// lib/password.ts — one source of truth for the account password policy, used by
// every form that sets a password (sign-up, calendar subscribe, reset password).
// This is client-side UX enforcement; mirror the same rules in Supabase Auth →
// Policies for true server-side enforcement.

export const PASSWORD_MIN = 8

export interface PasswordCheck { label: string; ok: boolean }

/** The individual requirements and whether `pw` satisfies each (for a live checklist). */
export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: `At least ${PASSWORD_MIN} characters`, ok: pw.length >= PASSWORD_MIN },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(pw) },
    { label: 'A lowercase letter', ok: /[a-z]/.test(pw) },
    { label: 'A number',            ok: /[0-9]/.test(pw) },
  ]
}

export function isStrongPassword(pw: string): boolean {
  return passwordChecks(pw).every((c) => c.ok)
}

/** A single human-readable error listing what's missing, or null when strong enough. */
export function passwordError(pw: string): string | null {
  const missing = passwordChecks(pw).filter((c) => !c.ok)
  if (missing.length === 0) return null
  return `Password needs ${missing.map((c) => c.label.toLowerCase()).join(', ')}.`
}
