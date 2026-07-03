'use client'

import { useState } from 'react'
import { Megaphone, Sparkles, BarChart3, Share2, PanelBottom } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  settings: Record<string, unknown>
}

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v : fallback
}

function SectionCard({ title, icon: Icon, hint, children }: {
  title: string; icon: React.ElementType; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
          <Icon size={15} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          {hint && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start py-4 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

function Input({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-y"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    />
  )
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
        style={{ background: 'var(--gold)' }}
      >
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

export default function ContentClient({ settings }: Props) {
  // Announcement bar
  const [announcement, setAnnouncement] = useState(str(settings.announcement_text))
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  // Hero
  const [heroEyebrow,  setHeroEyebrow]  = useState(str(settings.hero_eyebrow))
  const [heroHeadline, setHeroHeadline] = useState(str(settings.hero_headline))
  const [heroAccent,   setHeroAccent]   = useState(str(settings.hero_headline_accent))
  const [heroSubcopy,  setHeroSubcopy]  = useState(str(settings.hero_subcopy))
  const [savingHero, setSavingHero] = useState(false)

  // Stats
  const [statsRating,    setStatsRating]    = useState(str(settings.stats_rating))
  const [statsReviews,   setStatsReviews]   = useState(str(settings.stats_reviews))
  const [statsCustomers, setStatsCustomers] = useState(str(settings.stats_customers))
  const [savingStats, setSavingStats] = useState(false)

  // Socials
  const [instagram, setInstagram] = useState(str(settings.social_instagram))
  const [youtube,   setYoutube]   = useState(str(settings.social_youtube))
  const [pinterest, setPinterest] = useState(str(settings.social_pinterest))
  const [tiktok,    setTiktok]    = useState(str(settings.social_tiktok))
  const [savingSocials, setSavingSocials] = useState(false)

  // Footer
  const [footerBlurb, setFooterBlurb] = useState(str(settings.footer_blurb))
  const [savingFooter, setSavingFooter] = useState(false)

  async function save(data: Record<string, unknown>, setSaving: (v: boolean) => void) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Content saved')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      <SectionCard title="Announcement Bar" icon={Megaphone} hint="The gold strip at the very top of the storefront">
        <Field label="Announcement Text" hint="Keep it short — it renders on one line">
          <Input value={announcement} onChange={setAnnouncement}
            placeholder="✦ Free instant download on all digital planners · Shop Now ✦" />
        </Field>
        <SaveButton loading={savingAnnouncement}
          onClick={() => save({ announcement_text: announcement.trim() }, setSavingAnnouncement)} />
      </SectionCard>

      <SectionCard title="Homepage Hero" icon={Sparkles} hint="The main headline block on the homepage">
        <Field label="Eyebrow" hint="Small label above the headline">
          <Input value={heroEyebrow} onChange={setHeroEyebrow} placeholder="Premium digital & printable planners" />
        </Field>
        <Field label="Headline" hint="First line of the big heading">
          <Input value={heroHeadline} onChange={setHeroHeadline} placeholder="Plan your best life," />
        </Field>
        <Field label="Headline Accent" hint="Second line, shown in gold">
          <Input value={heroAccent} onChange={setHeroAccent} placeholder="beautifully." />
        </Field>
        <Field label="Subcopy" hint="Paragraph under the headline">
          <TextArea value={heroSubcopy} onChange={setHeroSubcopy}
            placeholder="Hyperlinked planners & notebooks designed to make organising a joy..." />
        </Field>
        <SaveButton loading={savingHero}
          onClick={() => save({
            hero_eyebrow:         heroEyebrow.trim(),
            hero_headline:        heroHeadline.trim(),
            hero_headline_accent: heroAccent.trim(),
            hero_subcopy:         heroSubcopy.trim(),
          }, setSavingHero)} />
      </SectionCard>

      <SectionCard title="Trust Stats" icon={BarChart3} hint="Aggregate numbers shown in the testimonials section">
        <Field label="Average Rating" hint='e.g. "4.9"'>
          <Input value={statsRating} onChange={setStatsRating} placeholder="4.9" />
        </Field>
        <Field label="Verified Reviews" hint='e.g. "2,400+"'>
          <Input value={statsReviews} onChange={setStatsReviews} placeholder="2,400+" />
        </Field>
        <Field label="Happy Customers" hint='e.g. "50,000+"'>
          <Input value={statsCustomers} onChange={setStatsCustomers} placeholder="50,000+" />
        </Field>
        <SaveButton loading={savingStats}
          onClick={() => save({
            stats_rating:    statsRating.trim(),
            stats_reviews:   statsReviews.trim(),
            stats_customers: statsCustomers.trim(),
          }, setSavingStats)} />
      </SectionCard>

      <SectionCard title="Social Links" icon={Share2} hint="Shown in the footer">
        <Field label="Instagram">
          <Input value={instagram} onChange={setInstagram} placeholder="https://instagram.com/arwignplanners" />
        </Field>
        <Field label="YouTube">
          <Input value={youtube} onChange={setYoutube} placeholder="https://youtube.com/@arwignplanners" />
        </Field>
        <Field label="Pinterest">
          <Input value={pinterest} onChange={setPinterest} placeholder="https://pinterest.com/arwignplanners" />
        </Field>
        <Field label="TikTok">
          <Input value={tiktok} onChange={setTiktok} placeholder="https://tiktok.com/@arwignplanners" />
        </Field>
        <SaveButton loading={savingSocials}
          onClick={() => save({
            social_instagram: instagram.trim(),
            social_youtube:   youtube.trim(),
            social_pinterest: pinterest.trim(),
            social_tiktok:    tiktok.trim(),
          }, setSavingSocials)} />
      </SectionCard>

      <SectionCard title="Footer" icon={PanelBottom} hint="Brand blurb in the footer's left column">
        <Field label="Footer Blurb">
          <TextArea value={footerBlurb} onChange={setFooterBlurb}
            placeholder="Premium digital & printable planners designed to make organising a joy..." />
        </Field>
        <SaveButton loading={savingFooter}
          onClick={() => save({ footer_blurb: footerBlurb.trim() }, setSavingFooter)} />
      </SectionCard>

    </div>
  )
}
