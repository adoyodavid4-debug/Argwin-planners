// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Single fixed action: publish "monday-morning-after-a-big-weekend-reset-your-week"
// with the user's photo as its cover (idempotent upsert on slug).
// Guarded by the SHA-256 of a random 384-bit token; the preimage is not in the
// repo, and wrong/missing tokens get an indistinguishable 404.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = 'c355a9b41c00f57a8938008f8442c2c8c38ecc1d5e0b61aec7587ef6183f1917'

const BODY = `You had a *great* weekend. The party was excellent. The food was excessive. Somebody's cousin sang. You went to bed on Sunday full of warm feelings about being alive.

Then 6:47am on Monday happens, and you wake into a small personal crisis: what was I even doing at work on Friday? What's due this week? Is there a meeting? Why does my inbox look like that? By 9:30 you've drunk two coffees, opened eleven tabs, achieved approximately nothing, and decided you are a fundamentally unserious person.

Good news: you're not. Monday just has a design flaw. It's the only morning of the week that asks you to **restart a whole system from cold**, with the least context and the least energy you'll have all week. Nobody plans for that. So let's plan for that.

> A bad Monday isn't caused by the weekend. It's caused by a Friday that ended without a plan.

## 1. Plan Monday on Friday, not on Sunday

Here's the single biggest upgrade, and it costs fifteen minutes: **do your weekly planning before the weekend starts, not after it ends.**

Sunday-night planning is a trap. You're tired, slightly nostalgic for Saturday, and every task you write down feels heavier than it actually is. That's the Sunday Scaries: not a real preview of your week, just a tired brain reading a to-do list in a minor key.

Friday-you, on the other hand, still remembers what happened this week. Friday-you knows the client hasn't replied, the file is half-finished, and the meeting got moved. Friday-you can set the table for Monday in a quarter of an hour — and then genuinely switch off, because the week is already handled.

**The Friday Fifteen**

- [x] **Brain dump, 4 minutes.** Everything still rattling around, straight onto a page. No sorting yet.
- [x] **Close the loops, 3 minutes.** Anything that takes under two minutes, do it now or it becomes Monday's problem.
- [x] **Pick next week's Big Three, 4 minutes.** The three things that, if done, make it a good week. Only three.
- [ ] **Build the landing strip, 3 minutes.** Write Monday's first task in full, with the file name and the link.
- [ ] **Shut the laptop and leave.** The week is planned. Go and enjoy the party guilt-free.

## 2. Leave yourself a landing strip

Pilots don't land in the dark without lights. Neither should you.

Before you finish on Friday, write down the *very first thing* you'll do on Monday morning — not as a vague heading, but as a task so specific that a sleepy stranger could do it. Not "work on proposal". Instead: **"Open Proposal_v3, finish the pricing table on page 4, the numbers are in the email from Wanjiru."**

This is the difference between waking up to a job and waking up to a puzzle. Monday-morning-you has very little fuel and should not be spending it on detective work.

## 3. Give Monday morning a shape

The reason Monday sprawls is that nothing tells it where to go. So give the first three hours a fixed shape and stop re-inventing it every week. Something like this:

| Time | Block | What happens |
| --- | --- | --- |
| First 20 min | **Don't open email** | Email is someone else's plan for your day. Make tea, sit down, look at your planner first. |
| 8:30 | **The Monday scan** | Ten minutes with the weekly spread: the Big Three, the calendar, anything due before Thursday. Move what's unrealistic now, not on Wednesday in a panic. |
| 8:40 | **The landing strip task** | The specific thing Friday-you left ready. Small, defined, finishable. Momentum is a physical thing. |
| 9:30 | **Now the inbox** | One pass, triage only. Reply to what takes two minutes, schedule the rest into the week. |
| 10:30 | **One deep block** | Ninety minutes on Big Three item one, phone in a drawer. Even a half-successful block makes the day feel legitimate. |
| Before lunch | **Tick something off** | Cross a line through a task before noon so the afternoon starts from "going well" rather than "already behind". |

Write this shape once, on a routine page in your planner, and stop deciding it weekly. It's a recipe, not a rule. Adjust the times to your actual life and your actual commute.

## 4. Start with a warm-up, not the hardest thing

Yes, we've all read "eat the frog". Do the hardest task first, says the internet. On a Tuesday, fine. But on the Monday after a weekend that involved a party and a cousin who sings, asking your brain to sprint from a standing start is how you end up reorganising your desktop icons for an hour instead.

Start with something **small, defined and finishable** — twenty minutes, tops. A file renamed. An invoice sent. A two-line reply that's been waiting. You're not procrastinating; you're warming up the engine. Then hit the hard thing at 10:30 when you've actually got a pulse.

## 5. The 3-2-1 Monday list

Long Monday lists are morale theatre. You write fourteen things, do five, and end the day feeling like a failure despite doing five whole things. Cap it instead:

- **3 must-dos.** Non-negotiable. If only these happen, Monday was a success.
- **2 move-alongs.** Things you nudge forward but don't finish. Progress counts.
- **1 nice-to-have.** The bonus. Do it if the day is kind to you. Roll it over guilt-free if not.

Six items. That's it. Everything else lives on the weekly spread, patiently, where it belongs. You'll get more done and, more importantly, you'll *feel* like you got more done — which is what determines whether Tuesday goes well.

## 6. Keep a Recovery Monday version in your back pocket

Some Mondays you wake up sharp. Some Mondays you wake up as a rumour of a person. Pretending otherwise is how a mediocre morning turns into a wasted day and a guilt spiral.

So write a second, smaller Monday plan on the same routine page and label it honestly. On a Recovery Monday: the Big Three becomes a Big One. The deep block becomes forty minutes. Admin, filing, tidying and the boring-but-easy tasks move to the front, because low-energy work is exactly what low-energy days are for. You still finish the day having moved the week forward, which is the entire point.

Having the smaller plan already written is the trick. Nobody designs a sensible day *while* having a rough one.

## 7. Plant something good on Monday

Here's the bit people skip. Part of why Monday feels grim is that the calendar is a cliff: everything fun was behind you, and ahead is five days of beige.

So fix the calendar. Deliberately put one good thing on Monday and keep it there permanently: the nice lunch, the gym class you actually like, a call with the colleague who makes you laugh, the podcast episode you saved on the commute. Small, fixed, reliably yours.

Do it for four weeks and something quietly shifts. Monday stops being the day the weekend ends and becomes the day the thing happens. That's not a productivity hack, it's just a better week.

## 8. Close the loop on Friday again

The routine only compounds if it's a loop. Friday plans Monday; Monday follows the plan; Friday reviews how it went and adjusts. Two minutes at the end of your Friday Fifteen: what did I overestimate this week? What kept sliding? Move it, shrink it, or delete it.

Four weeks of that and your weekly plan starts matching your actual capacity, which is the real reason anyone's planner ever stops working.

## The 15-minute setup

Don't wait for next Monday. Do this on Friday, whenever the next one is:

1. Block fifteen minutes at the end of Friday, recurring, and call it the Friday Fifteen.
2. Write your Monday shape on a routine page — plus the smaller Recovery Monday version underneath.
3. Before you shut the laptop, write Monday's landing-strip task in full, file name and all.
4. Put one good thing on Monday's calendar and leave it there.

Then go to the party. Stay late. Let the cousin sing. Monday's already handled.

---

*Our weekly and daily spreads have the Big Three, the 3-2-1 list and routine pages built in — hyperlinked for GoodNotes and Notability.* [Browse the planners →](/shop)`

const POST_ROW = {
  title: 'Monday Morning After a Big Weekend: How to Reset Your Week in 15 Minutes',
  slug: 'monday-morning-after-a-big-weekend-reset-your-week',
  excerpt:
    "Saturday was glorious. Sunday was a slow, happy blur. Then Monday arrives like a bill for it all. Here's the routine that makes Monday the easiest day of your week.",
  body: BODY,
  cover_image: '/blog-content/monday-reset.webp',
  category: 'Weekly planning',
  tags: ['monday routine', 'sunday reset', 'weekly planning', 'sunday scaries', 'productivity'],
  meta_title: 'Monday Morning After a Big Weekend: How to Reset Your Week in 15 Minutes',
  meta_description:
    'Beat the Sunday scaries and the Monday slump with a 15-minute Friday planning ritual, a fixed Monday morning routine and a 3-2-1 task list that actually gets finished.',
  read_time_mins: 7,
  status: 'published',
  published_at: '2026-09-25T09:00:00Z',
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-maint-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await db
    .from('blog_posts')
    .upsert(POST_ROW, { onConflict: 'slug' })
    .select('slug, status, cover_image')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, post: data })
}
