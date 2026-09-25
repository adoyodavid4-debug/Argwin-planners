// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Two fixed actions:
//   1. Restore "the-boring-one-task…" post to its original body (strip the
//      inline image that was added to the wrong post).
//   2. Publish "postgraduate-studies-and-full-time-work" with the user's photo
//      as its cover image (idempotent upsert on slug).
// Guarded by the SHA-256 of a random 384-bit token; the preimage is not in the
// repo, and wrong/missing tokens get an indistinguishable 404.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '8b66e154665d43a3ac48c0b69ceebf17171ece4d6dd934cef4aed336fafc7bd1'

// The exact image line that was inserted into the boring-one-task post.
const BORING_IMAGE = '\n\n![A planner open beside a laptop on a tidy desk — the weekly task getting done calmly](/blog-content/weekly-admin-desk.webp)'

const POSTGRAD_BODY = `The brochure said "designed for working professionals". It did not say which professionals, or how much work they were doing, or what happens in week twelve when your dissertation proposal and your year-end reporting arrive in the same seven days.

If you're doing a master's, a professional qualification or a PhD alongside a real job, you already know the standard advice is useless. "Study when you're fresh" — when, exactly? "Just be disciplined" — thank you, that's fixed it.

So let's skip that. Here's what actually makes the difference, from people who've done it: it isn't discipline, and it isn't time management in the usual sense. It's **seeing the collisions early** and designing a week that assumes you'll be tired, because you will be.

## 1. Map the whole term before week one

This is the highest-value hour you will spend all semester, and almost nobody spends it.

Sit down before term starts with three things: your module handbooks, your work calendar, and one big sheet of paper. Plot every assignment deadline, exam and submission across the fourteen weeks. Then, on the same sheet, plot everything you already know about work — quarter close, the audit, the conference, the launch, the month your colleague is on leave and you're covering.

Now look at where they land on top of each other. That's the map of your term, and those overlaps are the only weeks that will actually hurt.

**An illustrative term, mapped in advance** — study hours needed per week:

| Week | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Study hours | 8 | 8 | 10 | 14 | 9 | 10 | **18** | 10 | 12 | 16 | 12 | **20** | 18 | **22** |
| Work crunch | | | | | | ● | ● | | | | | ● | ● | ● |

Twelve hours a week is roughly what most people sustain alongside a full-time job. Three of the four weeks above that line land inside a work crunch. Seen in week zero, that's a planning problem with obvious solutions: start the week-twelve assignment in week nine, book leave for week fourteen now. Discovered in week eleven, it's a crisis.

Once you can see it, you can act on it months ahead, calmly, when the options are still cheap: pull work forward into the quiet weeks, book your annual leave around the two worst submissions *before* anyone else claims those days, warn your manager in September rather than apologising in November.

> You cannot avoid the collision weeks. You can be the person who saw them coming in September.

## 2. Decide what you're giving up — explicitly

Here's the conversation nobody wants to have with themselves. A part-time postgraduate course is typically twelve to twenty hours a week. That time is not hiding somewhere in your schedule waiting to be found through better productivity. It has to come out of something.

If you don't choose the subtraction deliberately, it gets taken from you at random — usually from sleep, exercise and the people you like, because those are the things with no deadline attached. So choose. Write it down. Make it a decision instead of a slow erosion.

**What's going:** two weeknights out, the side project, most Saturday mornings, two of the four series you're watching, volunteering until June.

**What is not negotiable:** sleep, one proper meal with the people you live with, one form of exercise, one full day off a week, every week.

The second list matters more than the first. Everything in it is what keeps you finishing the course — the people who drop out are almost never the ones who were short of time. They're the ones who ran themselves flat and stopped enjoying anything.

## 3. Build a weekly shape and stop negotiating with yourself

The single biggest drain on a working student isn't the studying. It's the daily internal debate about whether tonight is a study night. That argument costs more energy than the reading does.

So kill it with a fixed weekly shape. Same slots, every week, written into the planner before term starts. Three or four named blocks, protected like meetings, plus one reset:

| Day | Slot | What happens |
| --- | --- | --- |
| Monday | 6:00am | 90 min reading, before work touches you |
| Tuesday | — | Genuinely off. No guilt. |
| Wednesday | 6:00am | 90 min reading or lecture catch-up |
| Thursday | Evening | Class night. Nothing else planned. |
| Friday | — | You've earned it |
| Saturday | 8:00am | 3 hours. The big block: writing |
| Sunday | 7:00pm | 20 min reset for both lives |

Roughly nine focused hours, two completely free evenings and a whole free day. It looks modest. It's sustainable for fourteen weeks, which the heroic version isn't.

Mornings beat evenings for most people, for an unglamorous reason: at 6am nothing has gone wrong yet. Nobody has emailed you a crisis. By 8pm you've spent your good attention on work and you're asking your brain to do its hardest thinking on the fumes. If you are genuinely a night person, ignore this — but test it honestly for two weeks before deciding.

## 4. Match the task to the fuel you've got left

Not all study is the same work. Writing an argument needs a sharp brain. Formatting references, tidying notes, chasing a journal article, transcribing an interview — those need a pulse and not much else.

So sort your study tasks into two lists — **sharp** and **dull** — and match them to the slot. The Saturday block gets writing. The tired Tuesday twenty minutes gets the bibliography. This one change rescues an enormous amount of time that currently gets written off as "too tired to study", because you were never too tired to tidy references; you were just too tired for the thing you'd planned.

## 5. Make your job and your degree feed each other

The students who make this work aren't the ones with the most free time. They're the ones who stopped running two separate lives.

Wherever the rules allow it, point your coursework at your actual job. Make the case study your organisation. Write the policy critique on the policy you administer. Use your department's problem as the dissertation question. You get a paper you're already an expert in, you get access to data and interviewees, and your employer gets a piece of genuinely useful work — which makes them far more willing to give you the exam leave.

Same in reverse: what you're reading this week often has something to say about a live problem at work. Mention it. A manager who sees the degree paying for itself becomes an ally instead of an obstacle.

## 6. Finish two days early, on purpose

Set every personal deadline two days before the real one. Not as a motivational trick you'll see through — as a structural buffer, because your job *will* ambush you. Something will break on the Wednesday before the Friday submission. It does every time.

If you finish on the Wednesday and nothing breaks, you get an unexpectedly calm evening and a proofread. If something breaks, you're merely on time instead of pleading for an extension. Either way you never again submit at 11:47pm having read none of it back.

## 7. Tell people, early and specifically

Three conversations, worth having in week one rather than week eleven:

- **Your manager.** Not "I'm doing a master's", but the specifics: which evening you leave on time, the two weeks you'll need leave, and what you'll do to make sure it doesn't land on the team. Vague announcements get vague support; a specific plan gets a yes.
- **The people you live with.** The Saturday-morning block has to be agreed, not assumed, or it becomes a weekly argument. And say out loud how long this lasts — "eighteen months, then it's over" is a very different thing to live with than an indefinite disappearance.
- **Your course tutor.** Tell them you're working full-time. They can't help with a crisis they only learn about after the deadline, and most are notably kinder to the student who flagged a work emergency on Monday than the one who went quiet for a fortnight.

## 8. Plan the crash, not just the sprint

After every big submission there's a flat week where you get nothing done. That week is not a failure of character; it's the bill. So put it in the plan. Schedule the light week straight after each deadline, and don't fill it with the things you postponed.

Same for the term as a whole: the break between semesters is not a bonus fourteen weeks of study time. Take a real one. The people who finish these courses are the ones who treated recovery as part of the schedule rather than something to feel guilty about.

## 9. Keep the reason somewhere you can see it

Around week nine of a hard term, the degree stops feeling like a choice and starts feeling like a thing being done to you. Everyone hits it. It passes, but it passes faster if you can remember why you signed up.

So write it on the first page of the planner, in your own handwriting, before term starts — the specific reason. The job you want. The gap you're closing. The person who said you couldn't. Then on the grim evenings, read it before you decide to quit, and make the decision in the morning instead. Most quitting decisions are made at 10pm, and almost none of them survive breakfast.

## The one-hour setup

Do this before term starts — or this weekend, if term has already started:

1. Map all fourteen weeks: assignment deadlines and work crunches on one sheet. Circle the collisions.
2. Book leave and warn your manager about the two worst weeks now, while the dates are still free.
3. Write your weekly shape — three or four study blocks, one reset, two protected free evenings.
4. Write the subtraction list, and the not-negotiable list beside it.
5. Move every deadline in your planner two days earlier than the real one.

It'll still be a hard year. But it'll be a hard year you designed, with the collisions known, the leave booked and the Saturday mornings agreed — which is an entirely different experience from being surprised by week twelve.

---

*Our academic and weekly planners have term maps, deadline trackers and study-block spreads built in — hyperlinked for GoodNotes and Notability.* [Browse the planners →](/shop)`

const POSTGRAD_POST = {
  title: 'The Balancing Act: Postgraduate Studies and a Demanding Work Life',
  slug: 'postgraduate-studies-and-full-time-work',
  excerpt:
    "Two full-time commitments, one calendar, and a finite number of evenings. You can't add hours to the week — but you can stop the two halves of your life from colliding.",
  body: POSTGRAD_BODY,
  cover_image: '/blog-content/postgraduate-work-study.webp',
  category: 'Study planning',
  tags: ['postgraduate study', 'working students', 'term planning', 'weekly routine', 'study schedule', 'work life balance'],
  meta_title: "How to Balance a Master's Degree With a Full-Time Job",
  meta_description:
    "A practical planning system for studying part-time while working full-time: map the term before week one, build a weekly shape you can sustain, and decide the subtraction before it's taken from you.",
  read_time_mins: 9,
  status: 'published',
  published_at: '2026-09-25T08:00:00Z',
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

  // 1. Restore the boring-one-task post — strip the mis-added inline image.
  let boring: string
  const { data: bPost, error: bReadErr } = await db
    .from('blog_posts').select('id, body').eq('slug', 'the-boring-one-task-at-work-occurring-every-week').single()
  if (bReadErr || !bPost) {
    boring = `read-error:${bReadErr?.message ?? 'not found'}`
  } else if (!bPost.body?.includes('/blog-content/weekly-admin-desk.webp')) {
    boring = 'already-clean'
  } else {
    const restored = bPost.body.split(BORING_IMAGE).join('')
    const { error } = await db.from('blog_posts').update({ body: restored }).eq('id', bPost.id)
    boring = error ? `update-error:${error.message}` : 'image-removed'
  }

  // 2. Publish the postgraduate post (idempotent on slug).
  const { data: pRow, error: pErr } = await db
    .from('blog_posts')
    .upsert(POSTGRAD_POST, { onConflict: 'slug' })
    .select('slug, status, cover_image')
    .single()

  return NextResponse.json({
    ok: true,
    boring,
    postgrad: pErr ? `error:${pErr.message}` : pRow,
  })
}
