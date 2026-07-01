'use client'
import { useRef } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { Link2, Ruler, Type, Tablet, Zap, Heart, Download, Sparkles, ArrowRight, Check, ArrowDown, PenLine } from 'lucide-react'

function useReveal() {
  const reduce = useReducedMotion()
  return (delay = 0) => reduce ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay } }
}

export function WhyArwign() {
  const reveal = useReveal()
  const items = [
    { icon: Link2,      title: 'Hyperlinked navigation', body: 'Tap any tab to jump between views instantly.' },
    { icon: Ruler,      title: 'Three sizes',            body: 'A4, US Letter and A5 in every download.' },
    { icon: Type,       title: 'Lora + Poppins',         body: 'Editorial type, crafted detail by detail.' },
    { icon: Tablet,     title: 'Works in your apps',     body: 'GoodNotes, Notability, Xodo and print.' },
    { icon: Zap,        title: 'Instant delivery',       body: 'Files land in your inbox at checkout.' },
    { icon: Heart,      title: 'Warm, inclusive design', body: 'Calm layouts made for real, busy lives.' },
  ]
  return (
    <section className="py-16 lg:py-20 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }} aria-label="Why Arwign">
      <div className="container-site">
        <motion.div {...reveal()} className="text-center mb-12 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>The Arwign difference</p>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>Made to be used, not just bought</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} {...reveal(i * 0.05)} className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
              <h3 className="font-semibold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── "How it works" — animated step journey ────────────────────
function MiniCover({ hex, spine, ink, w = 54, style }: { hex: string; spine: string; ink: string; w?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: w, aspectRatio: '3/4', borderRadius: '4px 8px 8px 4px', background: `linear-gradient(135deg, ${hex}, ${spine})`, boxShadow: '0 10px 20px rgba(44,42,53,0.20)', border: '2px solid var(--bg-card)', position: 'absolute', ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: spine, borderRadius: '4px 0 0 4px' }} />
      <div style={{ position: 'absolute', inset: '8px 6px 8px 10px', border: `1px solid ${ink}30`, borderRadius: 3 }} />
    </div>
  )
}

// Step 1 — a product card being selected
function ChooseScene({ play }: { play: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 150 }} aria-hidden>
      <MiniCover hex="#9CC38C" spine="#83AE73" ink="#33502C" style={{ left: '50%', top: '52%', transform: 'translate(-96%,-50%) rotate(-13deg)' }} />
      <MiniCover hex="#F2C6A6" spine="#E3AC85" ink="#7E4A30" style={{ left: '50%', top: '52%', transform: 'translate(-4%,-50%) rotate(13deg)' }} />
      <motion.div className="absolute" style={{ left: '50%', top: '50%', transformStyle: 'preserve-3d' }}
        animate={play ? { y: [0, -7, 0], rotateZ: [0, -1.5, 0] } : undefined} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
        <div style={{ transform: 'translate(-50%,-50%)', position: 'relative' }}>
          <div style={{ width: 66, aspectRatio: '3/4', borderRadius: '5px 10px 10px 5px', background: 'linear-gradient(135deg, #E0A82C, #C28E1C)', boxShadow: '0 16px 30px rgba(224,168,44,0.4)', border: '2px solid var(--bg-card)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: '#C28E1C', borderRadius: '5px 0 0 5px' }} />
            <div style={{ position: 'absolute', inset: '10px 8px 10px 12px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4 }} />
            <motion.span className="absolute" style={{ inset: -6, borderRadius: 14, border: '2px solid var(--gold)' }} animate={play ? { opacity: [0.35, 1, 0.35], scale: [0.98, 1.03, 0.98] } : { opacity: 1 }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          <motion.span className="absolute flex items-center justify-center" style={{ left: -9, top: -9, width: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 2px 6px rgba(224,168,44,0.5)' }}
            initial={{ scale: 0 }} animate={play ? { scale: [0, 1.15, 1, 1, 0] } : { scale: 1 }} transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.18, 0.28, 0.85, 1] }}>
            <Check size={12} color="#fff" strokeWidth={3} />
          </motion.span>
        </div>
      </motion.div>
    </div>
  )
}

// Step 2 — a file downloading into a device
function DownloadScene({ play }: { play: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 150 }} aria-hidden>
      <div className="absolute left-1/2" style={{ bottom: 16, transform: 'translateX(-50%)', width: 100, height: 72, borderRadius: 14, background: 'var(--bg-card)', border: '2px solid var(--border)', boxShadow: '0 14px 26px rgba(44,42,53,0.14)' }}>
        <div style={{ position: 'absolute', inset: 8, borderRadius: 9, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
          <motion.div className="absolute left-1/2 flex items-center justify-center" style={{ top: '50%', width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', transform: 'translate(-50%,-50%)' }}
            initial={{ scale: 0, opacity: 0 }} animate={play ? { scale: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] } : { scale: 0 }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.68, 0.9, 1] }}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </motion.div>
        </div>
      </div>
      <motion.div className="absolute left-1/2" style={{ transform: 'translateX(-50%)', top: 6 }}
        animate={play ? { y: [0, 52, 52], opacity: [1, 1, 0] } : { y: 0, opacity: 1 }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.7], ease: 'easeIn' }}>
        <div style={{ width: 42, height: 52, borderRadius: 7, background: '#fff', border: '1.5px solid var(--border)', boxShadow: '0 8px 16px rgba(44,42,53,0.16)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 8, right: 8, top: 11, height: 3, borderRadius: 2, background: 'var(--border)' }} />
          <div style={{ position: 'absolute', left: 8, right: 14, top: 18, height: 3, borderRadius: 2, background: 'var(--border)' }} />
          <span className="absolute left-1/2" style={{ bottom: 7, transform: 'translateX(-50%)', color: 'var(--gold)' }}><Download size={15} /></span>
        </div>
      </motion.div>
      <motion.span className="absolute left-1/2" style={{ transform: 'translateX(-50%)', top: 66, color: 'var(--gold)' }} animate={play ? { y: [0, 5, 0], opacity: [0.5, 1, 0.5] } : { opacity: 1 }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}>
        <ArrowDown size={16} />
      </motion.span>
    </div>
  )
}

// Step 3 — a page coming to life in an app
function UseScene({ play }: { play: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 150 }} aria-hidden>
      <div className="absolute" style={{ inset: '10px 14px 12px 14px', borderRadius: 14, background: 'var(--bg-card)', border: '2px solid var(--border)', boxShadow: '0 14px 26px rgba(44,42,53,0.14)', overflow: 'hidden' }}>
        <div className="flex items-center gap-1.5 px-3" style={{ height: 22, background: 'var(--bg-secondary)' }}>
          {['#C97B5A', '#E0A82C', '#9CC38C'].map((c) => <span key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
        </div>
        {/* page */}
        <div className="absolute" style={{ inset: '28px 34px 12px 12px', background: '#fff', borderRadius: 6, boxShadow: 'inset 0 0 0 1px var(--border)' }}>
          {[{ w: '66%', c: 'var(--gold)' }, { w: '84%', c: 'var(--border)' }, { w: '52%', c: 'var(--border)' }].map((ln, r) => (
            <motion.div key={r} className="absolute" style={{ left: 10, top: 14 + r * 16, width: ln.w, height: 4, borderRadius: 3, background: ln.c, transformOrigin: 'left' }}
              initial={{ scaleX: play ? 0 : 1 }} animate={play ? { scaleX: 1 } : { scaleX: 1 }}
              transition={play ? { duration: 0.7, repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.6, delay: r * 0.25, ease: 'easeInOut' } : { duration: 0 }} />
          ))}
          <motion.span className="absolute" style={{ color: 'var(--gold)', right: 8, top: 8 }} animate={play ? { rotate: [0, -8, 0], y: [0, -1, 0] } : undefined} transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.6, ease: 'easeInOut' }}><PenLine size={15} /></motion.span>
        </div>
        {/* side tabs */}
        <div className="absolute flex flex-col gap-1.5" style={{ right: 10, top: 30 }}>
          {['#9CC38C', '#F2C6A6', '#E0A82C'].map((c, i) => (
            <motion.span key={c} style={{ width: 14, height: 12, borderRadius: '0 4px 4px 0', background: c }}
              animate={play ? { opacity: [0.5, 1, 0.5], x: [0, -2, 0] } : { opacity: 0.85 }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const HIW_GAP_X = '2rem'   // md:gap-x-8
const HIW_GAP_Y = '3rem'   // gap-y-12

export function HowItWorks() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-90px' })
  const shown = inView || reduce           // reveal + path draw
  const play  = inView && !reduce          // subtle looping micro-animations

  const steps = [
    { title: 'Choose',          body: 'Pick a ready-made design or personalise your own.', Scene: ChooseScene },
    { title: 'Download',        body: 'Your files arrive instantly — by email and in your account.', Scene: DownloadScene },
    { title: 'Use it anywhere', body: 'Open in GoodNotes or print at home. Start today.', Scene: UseScene },
  ]

  return (
    <section className="py-16 lg:py-24 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }} aria-label="How it works">
      <div className="container-site" ref={ref}>
        <div className="text-center mb-14">
          <motion.p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}
            initial={reduce ? false : { opacity: 0, y: 10 }} animate={shown ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4 }}>Simple as 1·2·3</motion.p>
          <motion.h2 className="font-display" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}
            initial={reduce ? false : { opacity: 0, y: 12 }} animate={shown ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.05 }}>How it works</motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-y-12 md:gap-y-0 md:gap-x-8 max-w-4xl mx-auto">
          {steps.map(({ title, body, Scene }, i) => {
            const last = i === steps.length - 1
            return (
              <div key={title} className="relative flex flex-row md:flex-col items-start md:items-center gap-5 md:gap-0 md:text-center">
                {/* connectors (from this badge to the next) */}
                {!last && (
                  <>
                    {/* desktop horizontal */}
                    <span aria-hidden className="hidden md:block absolute" style={{ top: 23, left: '50%', width: `calc(100% + ${HIW_GAP_X})`, height: 3, borderRadius: 3, background: 'var(--border)' }}>
                      <motion.span className="block h-full rounded-full" style={{ transformOrigin: 'left', background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }}
                        initial={reduce ? false : { scaleX: 0 }} animate={shown ? { scaleX: 1 } : { scaleX: 0 }} transition={{ duration: 0.7, ease: 'easeInOut', delay: 0.2 + i * 0.35 }} />
                    </span>
                    {/* mobile vertical */}
                    <span aria-hidden className="md:hidden absolute" style={{ left: 23, top: 23, width: 3, height: `calc(100% + ${HIW_GAP_Y})`, borderRadius: 3, background: 'var(--border)' }}>
                      <motion.span className="block w-full rounded-full" style={{ transformOrigin: 'top', background: 'linear-gradient(180deg, var(--gold), var(--gold-light))' }}
                        initial={reduce ? false : { scaleY: 0 }} animate={shown ? { scaleY: 1 } : { scaleY: 0 }} transition={{ duration: 0.7, ease: 'easeInOut', delay: 0.2 + i * 0.35 }} />
                    </span>
                  </>
                )}

                {/* numbered badge */}
                <motion.div className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-display text-lg font-bold"
                  style={{ background: 'var(--bg-card)', border: '2px solid var(--gold)', color: 'var(--gold-dark)', boxShadow: '0 4px 14px rgba(224,168,44,0.25)' }}
                  initial={reduce ? false : { scale: 0, opacity: 0 }} animate={shown ? { scale: 1, opacity: 1 } : {}} transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.15 + i * 0.18 }}>
                  {i + 1}
                </motion.div>

                {/* content */}
                <motion.div className="flex-1 md:flex-none min-w-0 md:mt-6"
                  initial={reduce ? false : { opacity: 0, y: 20 }} animate={shown ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 + i * 0.18 }}>
                  <div className="group rounded-2xl border p-4 mb-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} tabIndex={0} role="img" aria-label={`${title} — step ${i + 1}`}>
                    <div className="transition-transform duration-300 group-hover:scale-[1.04] group-focus-within:scale-[1.04]"><Scene play={play} /></div>
                  </div>
                  <h3 className="font-semibold text-lg mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                  <p className="text-sm leading-relaxed md:max-w-xs md:mx-auto" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                </motion.div>
              </div>
            )
          })}
        </div>

        {/* subtle closing CTA */}
        <motion.div className="text-center mt-14" initial={reduce ? false : { opacity: 0 }} animate={shown ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.7 }}>
          <Link href="/shop" className="btn-outline">Start browsing <ArrowRight size={15} /></Link>
        </motion.div>
      </div>
    </section>
  )
}

export function FinalCTA() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden border-t py-20 lg:py-28" style={{ borderColor: 'var(--border)', background: `linear-gradient(135deg, rgba(var(--gold-rgb),0.16) 0%, rgba(184,169,212,0.10) 55%, rgba(var(--gold-rgb),0.06) 100%)` }} aria-label="Shop the collection">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 320, height: 320, top: -110, left: '10%', background: 'var(--gold)' }} />
        <div className="absolute rounded-full blur-3xl opacity-25 animate-float-delayed" style={{ width: 260, height: 260, bottom: -90, right: '8%', background: 'var(--lavender)' }} />
      </div>
      <motion.div initial={reduce ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        className="container-site relative text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4 px-3 py-1.5 rounded-full" style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.16)', letterSpacing: '0.12em' }}><Sparkles size={12} /> Start today</p>
        <h2 className="font-display mb-4" style={{ fontSize: 'clamp(2.1rem,5vw,3.4rem)', color: 'var(--text-primary)', lineHeight: 1.05 }}>Your best-planned year starts here</h2>
        <p className="text-base mb-9 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>Instant download, works in every app, backed by our 30-day happiness promise.</p>
        <Link href="/shop" className="btn-primary text-base !px-9 !py-4">Shop the collection <ArrowRight size={17} /></Link>
      </motion.div>
    </section>
  )
}
