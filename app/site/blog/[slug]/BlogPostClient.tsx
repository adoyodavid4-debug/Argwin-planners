'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Clock, Eye, Tag, ChevronRight, ArrowRight,
  ArrowLeft, BookOpen, Share2, Lightbulb,
  Check, Minus, Trophy,
} from 'lucide-react'
import type { BlogPost } from '../blog-data'

// ── Prose helpers ─────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2
        className="font-display text-2xl md:text-3xl mb-4"
        style={{ color: 'var(--text-primary)', lineHeight: 1.15 }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.96rem] leading-[1.85] mb-5" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </p>
  )
}

function Callout({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      className="flex gap-4 p-5 rounded-2xl border my-6"
      style={{ background: 'rgba(201,168,76,0.07)', borderColor: 'rgba(201,168,76,0.30)' }}
    >
      {icon && <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }}>{icon}</div>}
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{children}</div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="text-center p-5 rounded-2xl border"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <p className="font-display font-semibold mb-1" style={{ fontSize: '2rem', color: 'var(--gold)' }}>{value}</p>
      <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  )
}

function Tip({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5"
        style={{ background: 'var(--gold)', color: 'white', fontFamily: 'var(--font-jost)' }}
      >
        {number}
      </div>
      <div>
        <p className="font-semibold mb-1.5 text-[0.95rem]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
          {title}
        </p>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</div>
      </div>
    </div>
  )
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="border-l-4 pl-6 my-8 py-2"
      style={{ borderColor: 'var(--gold)' }}
    >
      <p className="font-display text-xl italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {children}
      </p>
    </blockquote>
  )
}

// ── Full article content keyed by slug ────────────────────────
function HabitLoopArticle() {
  return (
    <>
      <P>
        You have probably heard that habits take 21 days to form. That number is repeated in
        self-help books, motivational posters, and productivity podcasts as though it were settled
        science. It is not. It is a misquoted observation from a plastic surgeon in 1960, and
        believing it may be quietly sabotaging your habit-building efforts.
      </P>
      <P>
        Here is where the number came from, what the peer-reviewed research actually shows, and —
        more importantly — what this means for how you use your habit tracker.
      </P>

      <Section title="Where the &ldquo;21 Days&rdquo; Myth Came From">
        <P>
          In 1960, plastic surgeon Dr. Maxwell Maltz published <em>Psycho-Cybernetics</em>, a
          self-help book that went on to sell over 30 million copies. In it, Maltz noted that his
          patients seemed to take roughly 21 days to adjust to their new appearances after surgery —
          to stop feeling strange when they looked in the mirror.
        </P>
        <P>
          He wrote that it takes &ldquo;a minimum of about 21 days&rdquo; for old mental images to
          dissolve. That vague observation — a minimum, not an average, about physical self-image,
          not behavioural automaticity — got passed through decades of self-help literature until it
          hardened into fact: <em>habits take 21 days</em>.
        </P>
        <Callout icon={<Lightbulb size={16} />}>
          Maltz was describing how long it took surgical patients to feel comfortable with a new
          face. He was not running a controlled study on habit formation. The 21-day figure was
          never meant to be a universal rule.
        </Callout>
      </Section>

      <Section title="What the Research Actually Says">
        <P>
          In 2010, researcher Phillippa Lally and her team at University College London published
          the most rigorous study on habit formation to date in the{' '}
          <em>European Journal of Social Psychology</em>. They followed 96 participants over
          12 weeks as each tried to adopt a new everyday habit — eating a piece of fruit with lunch,
          drinking a bottle of water with breakfast, or going for a 15-minute run before dinner.
        </P>
        <P>
          Participants rated how automatic each behaviour felt on a scale each day. When the data
          was analysed, the pattern was clear but far messier than any 21-day rule could capture.
        </P>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 my-8">
          <Stat value="66 days"  label="Average time to automaticity" />
          <Stat value="18 days"  label="Fastest (simple habits)" />
          <Stat value="254 days" label="Slowest (complex habits)" />
        </div>

        <PullQuote>
          Missing a single day — or even a few scattered days — had no significant impact on
          the final outcome. The trajectory mattered more than perfect consistency.
        </PullQuote>

        <P>
          That last finding is the most important one for anyone using a habit tracker. Occasional
          lapses did not derail habit formation in Lally&rsquo;s data. The streak is not what
          builds the habit. The repeated return to the behaviour is.
        </P>
      </Section>

      <Section title="Why the Range Is So Wide">
        <P>
          The 18&ndash;254 day spread is not random noise. Several factors reliably predict where
          on the distribution a given person and habit will land.
        </P>

        <div className="space-y-4 my-6">
          {[
            {
              factor: 'Complexity',
              detail: `Drinking a glass of water is neurologically much simpler than a 30-minute workout. The more steps a behaviour involves, the more neural pathways need to be consolidated, and the longer automaticity takes.`,
            },
            {
              factor: 'Friction with existing patterns',
              detail: `A habit that slots naturally into your existing routine forms faster than one requiring you to restructure your day. Early morning exercise is harder to automate if your natural sleep pattern runs late.`,
            },
            {
              factor: 'Environmental triggers',
              detail: `Habits anchored to a specific time, location, or preceding action form faster. The cue reduces the cognitive load of remembering to do the behaviour — eventually the context itself fires the routine.`,
            },
            {
              factor: 'Individual neurobiology',
              detail: `People vary in neuroplasticity and dopaminergic reward sensitivity. Some people form habits faster simply because their brains respond more strongly to the reward signal that reinforces the behaviour.`,
            },
          ].map(({ factor, detail }) => (
            <div key={factor} className="flex gap-3">
              <div
                className="w-1.5 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: 'var(--gold)', height: 'auto', minHeight: 16 }}
              />
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  {factor}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What This Means for Your Habit Tracker">
        <Tip number={1} title="Stop expecting it to feel automatic by day 21">
          <p>
            If you expect automaticity by day 21, you will be in a quiet crisis on day 22 when the
            behaviour still feels like an effort. This is normal — you are simply not finished yet.
            A 66-day tracker recalibrates your expectations from the start: you are building
            something that takes time, and the tracker is a record of that process.
          </p>
        </Tip>

        <Tip number={2} title="Mark missed days honestly — do not leave them blank">
          <p>
            Lally&rsquo;s research shows that missing a day does not reset your progress. What
            damages progress is the story you tell yourself about the miss. &ldquo;I broke the
            chain, I may as well start over&rdquo; is a thought pattern, not a biological reality.
            Your brain has already started consolidating the pathway. One break does not erase it.
          </p>
          <p className="mt-2">
            Mark missed days with a different symbol rather than leaving them blank. A gap in the
            record is a data point. A blank page feels like an accusation.
          </p>
        </Tip>

        <Tip number={3} title="Design your trigger before day one">
          <p>
            The UCL study showed that habit formation accelerated when behaviours were anchored to
            existing routines — what researchers call implementation intentions. Before you start
            tracking, write down:
          </p>
          <ul className="mt-2 ml-4 space-y-1 list-disc list-outside" style={{ color: 'var(--text-secondary)' }}>
            <li>The exact time you will do the habit</li>
            <li>The exact location</li>
            <li>The existing routine it will follow (your trigger)</li>
          </ul>
          <p className="mt-2">
            &ldquo;I will journal for 10 minutes after I make my morning coffee&rdquo; outperforms
            &ldquo;I will journal in the mornings&rdquo; every time.
          </p>
        </Tip>

        <Tip number={4} title="Track the full loop, not just the behaviour">
          <p>
            Most trackers record a binary: done or not done. The most useful tracking captures the
            full cue&ndash;routine&ndash;reward loop: what triggered you, what you did, and how it
            felt immediately after. Over 66 days, patterns in this data reveal which cues are
            reliable, which rewards feel satisfying, and where in the loop your habit is most
            vulnerable to breaking.
          </p>
        </Tip>

        <Tip number={5} title="At day 66, assess — do not assume">
          <p>
            Some habits will feel fully automatic by day 66. Others will not, and that is expected —
            you may simply be on the longer end of the distribution for that particular behaviour.
            Continue tracking. You are not failing; you are still building. The research gives no
            evidence that continuing past 66 days is counterproductive. It simply means the pathway
            needs more repetitions.
          </p>
        </Tip>
      </Section>

      <Section title="Using the Arwign 66-Day Habit Tracker">
        <P>
          Our 66-day tracker is built around Lally&rsquo;s research. A few practical notes for
          getting the most from it:
        </P>

        <div
          className="rounded-2xl border overflow-hidden my-6"
          style={{ borderColor: 'var(--border)' }}
        >
          {[
            {
              label: 'Start with 3 habits maximum',
              note: `Habit formation draws on cognitive resources. Spreading attention across too many new behaviours reduces the quality of each. Pick your three highest-priority habits.`,
            },
            {
              label: 'Fill in the trigger column before day 1',
              note: `The tracker has a dedicated column for your planned cue. Review it at the end of week one to confirm the trigger is actually working.`,
            },
            {
              label: 'Use the weekly review row',
              note: `At the end of each week, rate how automatic the habit felt (1–5). This gives you a trajectory curve over 66 days, not just a daily pass/fail.`,
            },
            {
              label: 'Treat the miss log as data',
              note: `When you miss a day, note why in the margin. After a few weeks, patterns in your reasons will tell you more about your habit than the habit itself.`,
            },
          ].map(({ label, note }, i) => (
            <div
              key={label}
              className="flex gap-4 p-4 border-b last:border-b-0"
              style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-card)' }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(201,168,76,0.18)', color: 'var(--gold)', fontFamily: 'var(--font-jost)' }}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>{label}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{note}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The Bottom Line">
        <P>
          The 21-day myth was never about science. It was about hope — the comforting idea that
          transformation is just three weeks away. That is an appealing thought, and it has sold
          millions of books. But it sets people up for a specific kind of discouragement: the
          feeling of failure on day 22 when nothing feels automatic yet.
        </P>
        <P>
          The 66-day reality is less dramatic but far more honest. Habits are built through
          repeated exposure over a longer timeline than most people expect. The exact timeline varies
          by person and behaviour. Occasional lapses are a normal and research-confirmed part of the
          process. And the behaviour that matters most is not the original habit — it is returning
          to the habit after a miss.
        </P>
        <PullQuote>
          You don&rsquo;t have to be perfect. You just have to keep going — and now you know
          exactly what &ldquo;keep going&rdquo; actually looks like.
        </PullQuote>
        <P>
          The next time you miss a day in your tracker, remember: Lally&rsquo;s subjects missed
          days too. They still formed their habits. So will you.
        </P>
      </Section>
    </>
  )
}

// Generic body for posts without full content yet
function ComingSoonBody({ post }: { post: BlogPost }) {
  return (
    <>
      <P>{post.excerpt}</P>
      <Callout icon={<BookOpen size={16} />}>
        <strong>Full article coming soon.</strong> We are working on the complete version of this
        piece. In the meantime, explore the related articles and planners below.
      </Callout>
    </>
  )
}

// ── Extra helpers used by comparison articles ─────────────────
function AppBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: color, color: 'white', fontFamily: 'var(--font-jost)' }}
    >
      {name}
    </span>
  )
}

function CompareRow({
  feature, gn, nb, winner,
}: {
  feature: string
  gn:      string
  nb:      string
  winner?: 'gn' | 'nb' | 'tie'
}) {
  const winnerBg = 'rgba(201,168,76,0.10)'
  return (
    <div
      className="grid grid-cols-[1fr_1fr_1fr] border-b text-sm last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="p-3 font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)', background: 'var(--bg-secondary)' }}>
        {feature}
      </div>
      <div className="p-3" style={{ color: 'var(--text-secondary)', background: winner === 'gn' ? winnerBg : 'transparent' }}>
        {winner === 'gn' && <Check size={11} className="inline mr-1" style={{ color: 'var(--gold)' }} />}
        {gn}
      </div>
      <div className="p-3" style={{ color: 'var(--text-secondary)', background: winner === 'nb' ? winnerBg : 'transparent' }}>
        {winner === 'nb' && <Check size={11} className="inline mr-1" style={{ color: 'var(--gold)' }} />}
        {nb}
      </div>
    </div>
  )
}

function VerdictBox({ app, emoji, who, why }: { app: string; emoji: string; who: string; why: string }) {
  return (
    <div
      className="flex gap-4 p-5 rounded-2xl border"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="text-2xl flex-shrink-0">{emoji}</div>
      <div>
        <p className="font-bold text-sm mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
          {app}
        </p>
        <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--gold)' }}>{who}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{why}</p>
      </div>
    </div>
  )
}

// ── GoodNotes vs Notability ───────────────────────────────────
function GoodNotesVsNotabilityArticle() {
  return (
    <>
      <P>
        GoodNotes and Notability are the two most popular apps for digital planning on iPad. Both
        support PDF import, Apple Pencil handwriting, and the hyperlinked navigation that makes
        digital planners interactive. Both cost roughly the same. Both have millions of loyal users.
      </P>
      <P>
        And yet they feel completely different to use. After testing both extensively with our full
        range of Arwign planner templates, here is our honest breakdown — what each does well,
        where each falls short, and which one matches your planning style.
      </P>

      <Callout icon={<Trophy size={16} />}>
        <strong>The quick answer:</strong> GoodNotes 6 for organisation and pen feel. Notability
        for a cleaner canvas and audio recording. Either works perfectly with any Arwign planner
        — the hyperlinks, tabs, and layouts are tested in both apps before release.
      </Callout>

      <Section title="Interface &amp; Learning Curve">
        <P>
          GoodNotes 6 uses a notebook metaphor: you create notebooks, organise them into folders,
          and pages live inside. It feels like a digital filing cabinet — familiar if you think in
          binders and sections. A home screen grid shows all your notebooks at a glance.
        </P>
        <P>
          Notability uses a flatter structure: notes live inside subjects (folders) in a single
          left-hand panel. There are fewer layers of hierarchy — some people find this more
          intuitive, others find it limiting once their library grows.
        </P>
        <P>
          <strong>For planners specifically:</strong> both apps let you navigate a PDF by scrolling
          or using the thumbnail strip. GoodNotes adds a document outline panel if your PDF
          has bookmarks. Notability shows a scrollable thumbnail sidebar. Neither is clearly
          better — it comes down to how you like to scan pages.
        </P>
      </Section>

      <Section title="PDF Import &amp; Annotation">
        <P>
          This is the most important category for planner users. Both apps handle PDF imports
          excellently — you can import via Files, AirDrop, email, or direct download, annotate
          freely with Apple Pencil or finger, add text boxes, and work directly on the template.
        </P>
        <P>
          The difference comes in rendering quality. GoodNotes renders PDFs at higher resolution,
          which matters when your planner has fine rule lines or small text. Notability&rsquo;s
          rendering is slightly softer — still excellent, but noticeable on detail-heavy layouts.
        </P>

        {/* Mini comparison table */}
        <div className="rounded-2xl border overflow-hidden my-6" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-[1fr_1fr_1fr] text-xs font-bold uppercase tracking-wide p-3"
            style={{ background: 'var(--charcoal)', color: 'white', letterSpacing: '0.07em' }}>
            <span>Feature</span>
            <span><AppBadge name="GoodNotes 6" color="#e84c27" /></span>
            <span><AppBadge name="Notability" color="#336ef7" /></span>
          </div>
          <CompareRow feature="PDF rendering" gn="High-res, crisp fine lines" nb="Slightly softer, still excellent" winner="gn" />
          <CompareRow feature="Import methods" gn="Files, AirDrop, email, URL" nb="Files, AirDrop, email, URL" winner="tie" />
          <CompareRow feature="Background colour" gn="Uses PDF background" nb="Can override with custom colour" winner="nb" />
          <CompareRow feature="Text boxes" gn="Yes, rich formatting" nb="Yes, basic formatting" winner="gn" />
          <CompareRow feature="Shape tools" gn="Yes + shape recognition" nb="Yes + shape recognition" winner="tie" />
          <CompareRow feature="Image insert" gn="Yes" nb="Yes" winner="tie" />
        </div>
      </Section>

      <Section title="Hyperlink Navigation">
        <P>
          Digital planners live and die by hyperlinks — the invisible tap targets that jump you
          from a monthly calendar to a weekly spread, or from a cover index to a specific section.
        </P>
        <P>
          <strong>GoodNotes 6</strong> handles internal PDF hyperlinks natively and reliably. Tap
          any section tab or navigation button in an Arwign planner and it jumps to the correct
          page instantly.
        </P>
        <P>
          <strong>Notability</strong> also handles PDF hyperlinks natively in its current version
          (Notability 13+). Earlier versions had occasional inconsistencies with internal PDF
          links on certain iPad models, but this has been resolved.
        </P>
        <PullQuote>
          All Arwign planner templates are hyperlink-tested in both GoodNotes 6 and Notability
          before release. Every tab, button, and navigation element works in both apps.
        </PullQuote>
      </Section>

      <Section title="Handwriting &amp; Stylus Feel">
        <P>
          This is where the apps diverge most noticeably — and where personal preference matters
          most.
        </P>
        <P>
          <strong>GoodNotes 6</strong> uses an ink engine widely regarded as the most realistic
          pen-on-paper feel in any note-taking app. Pressure sensitivity is well calibrated,
          palm rejection is excellent, and strokes have the right amount of natural variation.
          For freehand writing, drawing, and calligraphy, GoodNotes has a slight edge.
        </P>
        <P>
          <strong>Notability</strong> has a smoother, silkier ink engine — strokes feel more
          uniform and consistent. Some users prefer this for clean, fast handwriting. Palm
          rejection is equally good. The difference is subtle and depends entirely on whether
          you prefer variability or uniformity in your strokes.
        </P>
        <Callout icon={<Lightbulb size={16} />}>
          <strong>Practical tip:</strong> Download both free tiers and write your name ten times
          in each app. You will immediately feel which ink engine suits your handwriting style
          better than any comparison chart can tell you.
        </Callout>
      </Section>

      <Section title="Organisation System">
        <P>
          <strong>GoodNotes 6</strong> offers three levels: Notebooks → Folders → Pages. It also
          supports cross-notebook tags (added in GoodNotes 6), Quick Notes, and a powerful OCR
          search that finds handwritten text across every notebook you own.
        </P>
        <P>
          <strong>Notability</strong> uses two levels: Subjects → Notes. The structure is simpler
          but more limited. Search also uses OCR for handwriting. If you accumulate dozens of
          planners, journals, and notebooks over time, Notability&rsquo;s flat hierarchy can feel
          cramped.
        </P>
        <P>
          For a single planner PDF this distinction rarely matters — your planner is self-contained.
          It becomes relevant if you want one app for planning, journalling, meeting notes, and
          everything else in your life.
        </P>
      </Section>

      <Section title="Audio Recording (Notability Exclusive)">
        <P>
          Notability&rsquo;s standout feature — and the reason many students swear by it — is
          synchronised audio recording. While you write, Notability records audio and links your
          handwriting to the exact moment you wrote each word. Tap a sentence later and it
          plays back the audio from that precise moment.
        </P>
        <P>
          For lecture notes and meetings, this is genuinely transformative. For daily planning,
          it is largely irrelevant. If you want a single app that handles both your planner
          and your class notes, Notability&rsquo;s audio sync is a compelling differentiator.
          If you only plan, it is a feature you will never use.
        </P>
      </Section>

      <Section title="Sync, Backup &amp; Price">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <Stat value="$9.99" label="GoodNotes 6 per year" />
          <Stat value="$14.99" label="Notability per year" />
          <Stat value="Both" label="Free tiers available" />
        </div>
        <P>
          <strong>GoodNotes 6</strong> syncs across iPhone, iPad, and Mac via iCloud. Export to
          PDF, GoodNotes format, or images. External backup to Google Drive, Dropbox, or OneDrive
          is supported.
        </P>
        <P>
          <strong>Notability</strong> also syncs via iCloud and supports external backup. Its
          standout backup feature: auto-export of each note as a PDF every time you close it,
          creating a rolling archive without any manual action.
        </P>
        <P>
          GoodNotes is £5 per year cheaper. Both offer a free version to try before committing.
        </P>
      </Section>

      <Section title="The Verdict by Use Case">
        <div className="space-y-4 my-6">
          <VerdictBox
            app="GoodNotes 6"
            emoji="📓"
            who="Best for: organised multi-notebook users"
            why="If you want one app for your planner, journal, sketch book, and meeting notes — with a rich folder hierarchy, tags, and the best PDF rendering quality — GoodNotes 6 is the stronger organiser."
          />
          <VerdictBox
            app="GoodNotes 6"
            emoji="✏️"
            who="Best for: handwriting enthusiasts and illustrators"
            why="If ink feel matters to you — for calligraphy, annotations, or detailed freehand drawing on planner pages — GoodNotes 6's pen engine has a slight but real edge."
          />
          <VerdictBox
            app="Notability"
            emoji="🎙️"
            who="Best for: students and meeting-heavy professionals"
            why="If you take lecture notes or meeting notes in the same app you use to plan, Notability's audio sync is a genuine productivity superpower that GoodNotes simply doesn't have."
          />
          <VerdictBox
            app="Notability"
            emoji="🖊️"
            who="Best for: clean, distraction-free writing"
            why="If you prefer a minimal interface with a smooth, consistent ink feel and simple two-level organisation, Notability's cleaner canvas may suit your style better."
          />
        </div>
      </Section>

      <Section title="Which Works Best with Arwign Planners">
        <P>
          Every Arwign planner template is tested in both apps before it goes live in the shop.
          Every hyperlink, every section tab, every page layout renders correctly in GoodNotes 6
          and Notability. You will not lose any functionality or design quality by choosing either.
        </P>
        <P>
          Our default recommendation when customers ask is GoodNotes 6 — purely because it is the
          app our team uses daily, so our tutorials and screenshots use it. But that is a habit,
          not a verdict. Many of our most enthusiastic customers plan in Notability and love it
          equally.
        </P>
        <PullQuote>
          Download both free versions. Import one page from any Arwign planner. Write a few
          lines. Within ten minutes you will know which one feels right — and that feeling is
          more reliable than any comparison chart.
        </PullQuote>
        <P>
          Whatever you choose, you are getting a tool that will make your digital planner feel
          alive. The decision between these two excellent apps is a good problem to have.
        </P>
      </Section>
    </>
  )
}

// ── Article content registry ──────────────────────────────────
const CONTENT: Record<string, React.FC<{ post: BlogPost }>> = {
  'science-66-day-habit-loop':       () => <HabitLoopArticle />,
  'goodnotes-vs-notability-planner': () => <GoodNotesVsNotabilityArticle />,
}

// ── Per-post sidebar product ──────────────────────────────────
const SIDEBAR_PRODUCTS: Record<string, { name: string; blurb: string; price: string; href: string }> = {
  'science-66-day-habit-loop': {
    name:  '66-Day Habit Tracker — Printable',
    blurb: 'The tracker built around the research in this article. Track up to 5 habits, log your triggers, and visualise your 66-day arc.',
    price: '$4.99',
    href:  '/shop/66-day-habit-tracker-printable',
  },
  'goodnotes-vs-notability-planner': {
    name:  '2025 Ultimate Digital Planner',
    blurb: 'Fully hyperlinked, tested in both GoodNotes 6 and Notability. Works on iPad, iPhone, and Mac — start planning in under 60 seconds.',
    price: '$14.99',
    href:  '/shop/ultimate-digital-planner-2025',
  },
  'digital-planner-morning-routine': {
    name:  'Minimalist Digital Planner — Undated',
    blurb: 'Clean daily and weekly spreads designed for intentional mornings. Start any day of the year.',
    price: '$9.99',
    href:  '/shop/minimalist-digital-planner-undated',
  },
  'budget-planning-monthly-tracker-guide': {
    name:  'Monthly Budget Planner & Finance Tracker',
    blurb: 'Step-by-step budget spreads built around the method described in this guide. Income, bills, savings, and debt — all in one place.',
    price: '$11.99',
    href:  '/shop/monthly-budget-planner-finance-tracker',
  },
  'student-planner-guide-academic-year': {
    name:  'Academic Digital Planner 2025–2026',
    blurb: 'Semester overviews, weekly study plans, assignment trackers, and exam countdowns. Runs August 2025 – July 2026.',
    price: '$12.99',
    href:  '/shop/academic-digital-planner-2025-2026',
  },
  'self-care-wellness-routine-that-sticks': {
    name:  'Self-Care & Wellness Journal',
    blurb: 'Daily mood check-ins, gratitude prompts, water tracker, and weekly reflection spreads. For the wellness routine that actually sticks.',
    price: '$10.99',
    href:  '/shop/self-care-wellness-journal',
  },
}

const DEFAULT_PRODUCT = {
  name:  'The Complete Planner Bundle — 8 Planners',
  blurb: 'Every Arwign bestseller in one download. Over 60% off individual prices.',
  price: '$39.99',
  href:  '/shop/complete-planner-bundle',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Main component ────────────────────────────────────────────
interface Props {
  post:    BlogPost
  related: BlogPost[]
}

export default function BlogPostClient({ post, related }: Props) {
  const ArticleBody = CONTENT[post.slug] ?? ComingSoonBody

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero image ───────────────────────────────────── */}
      <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
        <Image
          src={post.cover || 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&q=80'}
          alt={post.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

        {/* Breadcrumb overlay */}
        <div className="absolute top-6 left-0 right-0">
          <div className="container-site">
            <nav className="flex items-center gap-1.5 text-xs text-white/70">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={12} />
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <ChevronRight size={12} />
              <span className="text-white/50 line-clamp-1">{post.title}</span>
            </nav>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container-site max-w-4xl">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4"
              style={{ background: 'var(--gold)', color: 'white', letterSpacing: '0.08em' }}
            >
              {post.category}
            </span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-white mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1, textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
            >
              {post.title}
            </motion.h1>
            <div className="flex flex-wrap items-center gap-5 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><Clock size={13} /> {post.readMins} min read</span>
              <span className="flex items-center gap-1.5"><Eye   size={13} /> {post.viewCount.toLocaleString()} views</span>
              <span>{formatDate(post.publishedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="container-site py-12">
        <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">

          {/* ── Main article column ─────────────────────── */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs mb-8 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={13} />
              All articles
            </Link>

            {/* Excerpt lead */}
            <p
              className="text-lg leading-relaxed mb-8 font-light border-l-4 pl-5 italic"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--gold)' }}
            >
              {post.excerpt.slice(0, 220)}{post.excerpt.length > 220 ? '…' : ''}
            </p>

            {/* Full article content */}
            <ArticleBody post={post} />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-8 border-t mt-8" style={{ borderColor: 'var(--border)' }}>
                <Tag size={13} style={{ color: 'var(--text-muted)' }} className="mt-0.5" />
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share strip */}
            <div
              className="flex items-center justify-between mt-8 p-4 rounded-2xl border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jost)' }}>
                Found this useful? Share it.
              </p>
              <button
                onClick={() => navigator.share?.({ title: post.title, url: window.location.href })}
                className="btn-outline py-2 px-4 text-xs"
              >
                <Share2 size={13} />
                Share
              </button>
            </div>
          </motion.article>

          {/* ── Sidebar ─────────────────────────────────── */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">

            {/* Related planner CTA — driven by SIDEBAR_PRODUCTS map */}
            {(() => {
              const sp = SIDEBAR_PRODUCTS[post.slug] ?? DEFAULT_PRODUCT
              return (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-2xl border overflow-hidden"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="p-5"
                    style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(184,169,212,0.08) 100%)' }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}>
                      Related Product
                    </p>
                    <p className="font-display text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                      {sp.name}
                    </p>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                      {sp.blurb}
                    </p>
                    <p className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                      {sp.price}
                    </p>
                    <Link
                      href={sp.href}
                      className="btn-primary w-full justify-center text-xs"
                    >
                      View Product <ArrowRight size={12} />
                    </Link>
                  </div>
                </motion.div>
              )
            })()}

            {/* Article quick-facts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl border p-5"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                Key Research Facts
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Study authors', value: 'Lally et al., UCL' },
                  { label: 'Published',     value: 'European Journal of Social Psychology, 2010' },
                  { label: 'Participants',  value: '96 adults over 12 weeks' },
                  { label: 'Average',       value: '66 days to automaticity' },
                  { label: 'Range',         value: '18 to 254 days' },
                  { label: 'Key finding',   value: 'Missing days had no significant impact' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>{label}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* More articles */}
            {related.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-2xl border p-5"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  More Articles
                </p>
                <div className="space-y-4">
                  {related.map((r) => (
                    <Link key={r.slug} href={`/blog/${r.slug}`} className="flex gap-3 group">
                      <div className="relative w-16 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={r.cover}
                          alt={r.title}
                          fill
                          sizes="64px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-gold transition-colors"
                          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
                        >
                          {r.title}
                        </p>
                        <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={9} /> {r.readMins} min
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Newsletter CTA ────────────────────────────────── */}
      <section
        className="border-t py-14"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.09) 0%, rgba(184,169,212,0.06) 60%, rgba(201,168,76,0.03) 100%)',
        }}
      >
        <div className="container-site max-w-xl mx-auto text-center">
          <div className="divider-gold mb-5" />
          <h2 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
            More tips like this, free.
          </h2>
          <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>
            Planning guides and productivity science delivered straight to your inbox — never spammy.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto"
          >
            <input type="email" required placeholder="your@email.com" className="input-field flex-1 text-sm" />
            <button type="submit" className="btn-primary text-sm whitespace-nowrap">Subscribe</button>
          </form>
        </div>
      </section>

    </div>
  )
}
