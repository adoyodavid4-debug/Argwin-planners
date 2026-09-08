'use client'
// Footer entry point so visitors can change or withdraw consent as easily as
// they gave it (PECR requirement). Reopens the cookie banner's preferences.
import { useConsent } from './ConsentProvider'

export default function CookieSettingsButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { openPreferences } = useConsent()
  return (
    <button type="button" onClick={openPreferences} className={className} style={style}>
      Cookie settings
    </button>
  )
}
