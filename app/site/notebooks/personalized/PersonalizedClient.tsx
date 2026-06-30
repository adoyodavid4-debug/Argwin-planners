'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Check, ChevronDown, ChevronRight, Tablet,
  Star, Quote, BadgeCheck, Link2, Layers, Ruler, Type, Sparkles, Palette, Clock,
} from 'lucide-react'
import CoverMockup from './CoverMockup'
import InteriorCarousel from './InteriorCarousel'
import RequestModal from './RequestModal'
import {
  COLOURWAYS, SIZES, MOTIFS, TEMPLATES, TABS_OPTIONS, SPREADS, FEATURES, STEPS,
  TURNAROUND, REVIEWS, RATING, REVIEW_COUNT, FAQS,
} from './data'

const FEAT_ICON: Record<string, React.ElementType> = { link: Link2, layers: Layers, ruler: Ruler, type: Type, tablet: Tablet, sparkles: Sparkles }

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />)}
    </span>
  )
}

export default function PersonalizedClient() {
  const reduce = useReducedMotion()
  const [colourId, setColourId] = useState(COLOURWAYS[0].id)
  const [sizeId, setSizeId]     = useState(SIZES[0].id)
  const [motifId, setMotifId]   = useState(MOTIFS[0].id)
  const [templates, setTemplates] = useState<string[]>([TEMPLATES[0].id])
  const [tabsId, setTabsId]     = useState(TABS_OPTIONS[0].id)
  const [name, setName]         = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [showCta, setShowCta]   = useState(false)
  const swatchRef = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const onScroll = () => setShowCta(window.scrollY > 640)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const colour = COLOURWAYS.find((c) => c.id === colourId)!
  const size   = SIZES.find((s) => s.id === sizeId)!
  const motif  = MOTIFS.find((m) => m.id === motifId)!
  const tabs   = TABS_OPTIONS.find((t) => t.id === tabsId)!
  const tplLabels = TEMPLATES.filter((t) => templates.includes(t.id)).map((t) => t.label)

  const toggleTemplate = (id: string) =>
    setTemplates((arr) => arr.includes(id) ? (arr.length > 1 ? arr.filter((x) => x !== id) : arr) : [...arr, id])

  const selections = {
    colour: colour.name, size: `${size.label} (${size.dim})`, motif: motif.label,
    templates: tplLabels, tabs: tabs.label, name,
  }

  const onSwatchKey = (e: React.KeyboardEvent, i: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % COLOURWAYS.length
    if (e.key === 'ArrowLeft')  next = (i - 1 + COLOURWAYS.length) % COLOURWAYS.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End')  next = COLOURWAYS.length - 1
    setColourId(COLOURWAYS[next].id)
    swatchRef.current[next]?.focus()
  }

  const reveal = (delay = 0) => reduce
    ? {}
    : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay } }

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO + CUSTOMISER ═════════════════════════════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)', background: `linear-gradient(160deg, ${colour.hex}22 0%, rgba(184,169,212,0.08) 55%, var(--bg-primary) 100%)`, transition: 'background 0.6s ease' }}>
        <div className="container-site py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 lg:items-start">

            {/* LEFT — copy + controls (scrolls) */}
            <div>
              <nav className="flex items-center gap-1.5 mb-5 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
                <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
                <ChevronRight size={12} /><Link href="/notebooks" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Notebooks</Link>
                <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>Personalised</span>
              </nav>

              <motion.p {...reveal()} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4 px-3 py-1.5 rounded-full"
                style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.12em' }}>
                <Sparkles size={12} /> Made to Order
              </motion.p>
              <motion.h1 {...reveal(0.05)} className="font-display mb-4" style={{ fontSize: 'clamp(2.3rem,5vw,3.6rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}>
                Your notebook,<br /><span style={{ color: 'var(--gold)' }}>designed around you.</span>
              </motion.h1>
              <motion.p {...reveal(0.1)} className="leading-relaxed max-w-md mb-7" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                Choose a colourway, size and motif — we hand-build a hyperlinked notebook to match, delivered in {TURNAROUND}.
              </motion.p>

              {/* Trust strip */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mb-9">
                {['GoodNotes', 'Notability', 'Xodo', 'PDF'].map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Check size={12} style={{ color: 'var(--gold)' }} /> {b}</span>
                ))}
              </div>

              {/* ── CUSTOMISER ─────────────────────────────── */}
              <div className="flex flex-col gap-7">
                {/* Colourway */}
                <div>
                  <div className="flex items-center gap-2 mb-3"><Palette size={15} style={{ color: 'var(--gold)' }} /><h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Colourway — {colour.name}</h2></div>
                  <div role="radiogroup" aria-label="Cover colourway" className="flex items-center gap-3">
                    {COLOURWAYS.map((c, i) => {
                      const active = c.id === colourId
                      return (
                        <button key={c.id} ref={(el) => { swatchRef.current[i] = el }} role="radio" aria-checked={active} aria-label={c.name}
                          tabIndex={active ? 0 : -1} onClick={() => setColourId(c.id)} onKeyDown={(e) => onSwatchKey(e, i)}
                          className="relative rounded-full transition-transform hover:scale-110"
                          style={{ width: 38, height: 38, background: c.hex, border: '2px solid var(--bg-card)', boxShadow: active ? `0 0 0 2px var(--gold)` : '0 1px 5px rgba(44,42,53,0.2)' }}>
                          {active && <Check size={15} style={{ color: c.ink, position: 'absolute', inset: 0, margin: 'auto' }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Size</h2>
                  <div className="flex flex-wrap gap-2.5">
                    {SIZES.map((s) => {
                      const active = s.id === sizeId
                      return (
                        <button key={s.id} onClick={() => setSizeId(s.id)} aria-pressed={active}
                          className="px-4 py-2.5 rounded-xl border text-left transition-all"
                          style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.10)' : 'var(--bg-card)' }}>
                          <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                          <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.dim}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Motif */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Cover motif</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {MOTIFS.map((m) => {
                      const active = m.id === motifId
                      return (
                        <button key={m.id} onClick={() => setMotifId(m.id)} aria-pressed={active}
                          className="p-3 rounded-xl border text-left transition-all" style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.10)' : 'var(--bg-card)' }}>
                          <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                          <span className="block text-[11px] leading-snug mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Templates (multi) */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Page templates</h2>
                  <div className="flex flex-wrap gap-2.5">
                    {TEMPLATES.map((t) => {
                      const active = templates.includes(t.id)
                      return (
                        <button key={t.id} onClick={() => toggleTemplate(t.id)} aria-pressed={active}
                          className="px-4 py-2 rounded-full border text-sm font-medium transition-all inline-flex items-center gap-1.5"
                          style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.12)' : 'var(--bg-card)', color: active ? 'var(--gold-dark)' : 'var(--text-secondary)' }}>
                          {active && <Check size={12} />} {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tabs choice */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Section tabs</h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {TABS_OPTIONS.map((t) => {
                      const active = t.id === tabsId
                      return (
                        <button key={t.id} onClick={() => setTabsId(t.id)} aria-pressed={active}
                          className="p-3 rounded-xl border text-left transition-all" style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.10)' : 'var(--bg-card)' }}>
                          <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                          <span className="block text-[11px] leading-snug mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Name / initials */}
                <div>
                  <label htmlFor="cover-name" className="text-sm font-semibold uppercase tracking-wide block mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Name or initials <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input id="cover-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. Amara O."
                    className="w-full max-w-xs rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--gold)]" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }} />
                </div>
              </div>
            </div>

            {/* RIGHT — sticky live preview + summary */}
            <div className="lg:sticky lg:top-24 self-start order-first lg:order-last">
              <div className="mb-7">
                <CoverMockup colour={colour} motif={motif} name={name} sizeLabel={size.label} />
              </div>

              {/* Selection summary (desktop) */}
              <div className="hidden lg:block rounded-3xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <h3 className="font-display text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Your design</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                  <SummaryRow label="Colour"><span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full" style={{ background: colour.hex, border: '1px solid var(--border)' }} />{colour.name}</span></SummaryRow>
                  <SummaryRow label="Size">{size.label}</SummaryRow>
                  <SummaryRow label="Motif">{motif.label}</SummaryRow>
                  <SummaryRow label="Tabs">{tabs.label}</SummaryRow>
                  <SummaryRow label="Templates">{tplLabels.join(', ')}</SummaryRow>
                  <SummaryRow label="Name">{name.trim() || '—'}</SummaryRow>
                </dl>
                <button onClick={() => setModalOpen(true)} className="btn-primary w-full justify-center">Personalise yours <ArrowRight size={15} /></button>
                <p className="text-[11px] text-center mt-2.5 inline-flex items-center justify-center gap-1 w-full" style={{ color: 'var(--text-muted)' }}><Clock size={11} /> Delivered in {TURNAROUND} · no payment now</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INTERIOR PREVIEW ══════════════════════════════════ */}
      <section className="container-site py-16">
        <motion.div {...reveal()} className="max-w-2xl mb-8">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Look Inside</p>
          <h2 className="font-display text-display-sm mb-2" style={{ color: 'var(--text-primary)' }}>Hyperlinked, beautifully laid out</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>A glimpse of the interior spreads and tab navigation you can tailor.</p>
        </motion.div>
        <motion.div {...reveal(0.05)} className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3"><InteriorCarousel spreads={SPREADS} /></div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            {FEATURES.slice(0, 4).map((f) => { const Icon = FEAT_ICON[f.icon] ?? Sparkles; return (
              <div key={f.title} className="flex items-start gap-3 p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={18} style={{ color: 'var(--gold)' }} /></div>
                <div><p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</p><p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.body}</p></div>
              </div>
            )})}
          </div>
        </motion.div>
      </section>

      {/* ══ FEATURE GRID ══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <motion.div {...reveal()} className="text-center mb-12 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Crafted to Last</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Every Detail, Considered</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => { const Icon = FEAT_ICON[f.icon] ?? Sparkles; return (
              <motion.div key={f.title} {...reveal(i * 0.05)} className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
                <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.body}</p>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="container-site py-16">
        <motion.div {...reveal()} className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>The Process</p>
          <h2 className="font-display text-display-sm mb-2" style={{ color: 'var(--text-primary)' }}>How It Works</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Made to order and delivered in {TURNAROUND}.</p>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} {...reveal(i * 0.08)} className="relative text-center flex flex-col items-center">
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center mb-4 font-display text-xl font-semibold" style={{ background: 'var(--bg-card)', border: '2px solid var(--gold)', color: 'var(--gold)' }}>{i + 1}</div>
              <h3 className="font-semibold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
              <p className="text-sm leading-relaxed max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ SOCIAL PROOF ══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <motion.div {...reveal()} className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3"><Stars value={RATING} size={18} /><span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{RATING} from {REVIEW_COUNT}+ happy customers</span></div>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Made for Them. Made for You.</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {REVIEWS.map((r, i) => (
              <motion.div key={r.name} {...reveal(i * 0.08)} className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <Quote size={24} style={{ color: 'var(--gold)', opacity: 0.4 }} className="mb-3" />
                <Stars value={5} size={13} />
                <p className="text-sm leading-relaxed my-4 flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}>{r.name.charAt(0)}</div>
                  <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p><p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> Verified Purchase</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════ */}
      <section className="container-site py-16 max-w-2xl mx-auto">
        <motion.div {...reveal()} className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Good to Know</p>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Frequently Asked</h2>
        </motion.div>
        <div className="flex flex-col gap-3">{FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} reduce={!!reduce} />)}</div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════ */}
      <section className="border-t py-16 newsletter-gradient" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Sparkles size={26} style={{ color: 'var(--gold)' }} /></div>
          <h2 className="font-display text-display-sm mb-3" style={{ color: 'var(--text-primary)' }}>Ready to make it yours?</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>We&rsquo;ll build your {colour.name.toLowerCase()} notebook to order and deliver it in {TURNAROUND}.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary">Start your design <ArrowRight size={15} /></button>
        </div>
      </section>

      {/* ══ STICKY CTA (mobile-friendly) ══════════════════════ */}
      <AnimatePresence>
        {showCta && !modalOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-40">
            {/* mobile collapsible summary + cta */}
            <div className="rounded-2xl border shadow-2xl overflow-hidden lg:hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <AnimatePresence initial={false}>
                {summaryOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs p-4 pb-2">
                      <SummaryRow label="Colour">{colour.name}</SummaryRow>
                      <SummaryRow label="Size">{size.label}</SummaryRow>
                      <SummaryRow label="Motif">{motif.label}</SummaryRow>
                      <SummaryRow label="Tabs">{tabs.label}</SummaryRow>
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => setSummaryOpen((v) => !v)} aria-expanded={summaryOpen} aria-label="Toggle selection summary" className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: colour.hex, border: '1px solid var(--border)' }} />
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{colour.name} · {size.label}</span>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                <button onClick={() => setModalOpen(true)} className="btn-primary !py-2.5 !px-5 text-xs flex-shrink-0">Personalise</button>
              </div>
            </div>
            {/* desktop floating button */}
            <button onClick={() => setModalOpen(true)} className="btn-primary shadow-gold-lg hidden lg:inline-flex">Personalise yours <ArrowRight size={15} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <RequestModal open={modalOpen} onClose={() => setModalOpen(false)} selections={selections} />
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</dt>
      <dd className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{children}</dd>
    </div>
  )
}

function FaqItem({ q, a, reduce }: { q: string; a: string; reduce: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-300" style={{ color: 'var(--gold)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
            <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
