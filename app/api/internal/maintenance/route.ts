// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Single fixed action: publish "the-stale-week-workload-reset" with a fitting
// cover image (idempotent upsert on slug).
// Guarded by the SHA-256 of a random 384-bit token; the preimage is not in the
// repo, and wrong/missing tokens get an indistinguishable 404.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = 'f574de82df685ae69e986fef510ee4009fae077c0678005f076504c9178c209f'

const BODY = `You know the week. Nothing is on fire, exactly. But the list is longer on Friday than it was on Monday. Three things have been rolling over so long they've become part of the furniture. Your boss has asked about the same deliverable twice and you can feel a third one coming. And underneath it all is that flat, sour feeling: *I am working constantly and nothing is moving.*

It's easy to read that as a character flaw. It almost never is. A stale week is a **systems problem with a very specific cause**, and once you can see the cause you can fix it in about twenty minutes. So let's look at the cause first, because it explains everything else.

## 1. The maths doesn't work, and nobody told you

Here's the thing nobody says out loud: your week has far fewer usable hours than your calendar implies. You're contracted for forty. Subtract meetings, the email tax, the "quick question" tax, context-switching, the thing that broke on Tuesday. What's left for actual task work is often half of what you think.

Meanwhile your to-do list is being written as though all forty hours are available. So every single week, you commit to more than exists, fall short, and roll the difference forward. Do that four weeks running and you get a stale week: a list made mostly of last month's failures.

**Where the stale feeling comes from** — an illustrative week:

| | Hours |
| --- | --- |
| Genuinely available for task work | 22h |
| Sitting on your list | 35h |
| **Never going to fit** | **13h** |

That 13-hour overhang is the stale part. It doesn't get done, it doesn't get dropped, so it rolls into next week and makes that week stale too. Nothing is wrong with you; the arithmetic simply never balanced.

> A stale week is just an unpaid debt of hours, rolling over with interest.

## 2. Get it all out of your head, once

Before anything can be fixed, you need to see the whole thing. Not the bits you remember at 3am. All of it.

So: one page, twenty minutes, no sorting. Every task, every half-promise, every "I should really…", every email you've been avoiding, every thing someone asked you for in a corridor. Include the personal stuff if it's taking up headspace. The goal isn't a plan yet, it's **an inventory**.

Two things happen when you do this. First, the list is usually shorter than the dread suggested, which is oddly reassuring. Second, you stop paying the background cost of remembering it all, which is a surprising amount of the "everything is heavy" feeling.

## 3. Sort it into five piles — and be honest about pile five

Now go through the inventory once and put every item into one of five piles. Move fast, don't agonise, first instinct is usually right.

- **Do** — it's genuinely yours, it matters this week, and it fits. *How long, realistically?*
- **Delegate** — someone else could do this, possibly better, possibly faster. *Who, and by when?*
- **Defer** — real, but not this week. Give it an actual date, not "later". *Which week, specifically?*
- **Delete** — it mattered in March. It doesn't now. Cross it out with feeling. *What happens if I never do this?*
- **Waiting on someone else** — not yours to move. It's blocked, and it has been sitting on your list pretending to be your failure. *Who am I waiting on, and when did I last chase?*

That fifth pile is the one that changes how the week feels. In most stale weeks, a good chunk of the list isn't actually work you can do — it's work you're waiting on. It still generates guilt every time your eye passes over it, which is deeply unfair to you. Get it onto a separate "waiting on" page with a name and a date next to each item, and your real list suddenly looks achievable.

## 4. Cut it to fit — out loud, with your boss in the room

Here's the bit most people skip, and it's the one that actually fixes things. Once you know your real capacity and your real list, the gap is not a secret you have to keep. It's information your manager needs.

The trick is *how* you bring it. Don't arrive with "I'm overloaded" — that sounds like a complaint and invites a pep talk. Arrive with the list and ask them to rank it. You're not refusing work; you're asking for a decision that's genuinely theirs to make.

**The renegotiation, in four sentences:**

> "I want to make sure I'm working on the right things this week." "Here's what's currently on my plate — *list the seven items* — and realistically I've got room for about *four* of them." "My read is that *A, B and C* are the most urgent. Would you agree?" "If *D* needs to happen this week too, what would you like me to push to next week?"

That last question is the whole game. It moves the trade-off from your private guilt to a shared decision — and managers, given a clear choice, almost always make a reasonable one.

## 5. Most nagging is a visibility problem

Let's talk about the boss who keeps asking. It rarely means they think you're slacking. It usually means they **can't see what's happening**, and the asking is how they cope with that. Work that's invisible feels, to a manager, like work that isn't moving.

So take the reporting off their hands before they have to chase. One short note, same time every week — Friday afternoon or Monday morning, pick one and never move it. Three lines, sixty seconds to write.

**The weekly note that stops the nagging:**

- **Done this week** — two or three things that are actually finished. Finished, not "progressing".
- **Moving next week** — the two or three things you're committing to. Keep this list short and keep it true.
- **Blocked / need from you** — what you're waiting on, from whom, and what you need a decision on. Name it plainly.

Do this four weeks running and two things change. The chasing stops, because the answer arrives before the question. And that third line quietly builds a record showing that the delays in your week are mostly other people's, which is a far better conversation to be having than "why isn't this done yet".

## 6. Protect one real block a day

A stale week is often a week made entirely of fragments: twenty minutes here, a meeting, ten minutes, an interruption. You can be busy for nine hours and never once have a stretch long enough to finish something meaningful. That's why the list doesn't shrink.

So defend **one ninety-minute block a day**. One. Put it in the calendar as a real appointment with a real name, at the hour you're sharpest. Phone in a drawer, notifications off, door shut if you have a door. Five of those a week is seven and a half hours of genuine progress, which is usually the difference between a week that moves and a week that doesn't.

And here's the cynical trick: when a block exists in the calendar as a commitment with a title, other people book around it. When it exists only as your good intention, they book straight through it.

## 7. Check in on Wednesday, not Friday

Most people discover their week has gone wrong on Friday at four, when there's nothing to be done about it but feel bad. Move the discovery to Wednesday lunchtime and you still have two days to act.

It takes ten minutes. Look at Monday's list and ask three questions: **What's actually done? What's quietly slipped? What needs to be renegotiated before Friday?** Then do the renegotiating on Wednesday afternoon, while it's still a small, calm conversation rather than a Friday-evening apology.

## 8. Keep a "done" list, not just a "to-do" list

The feeling that nothing is working is often a measurement error. Your to-do list only ever shows you what's outstanding — it is, structurally, a list of your failures. You could have a genuinely excellent week and the list would still look like a rebuke.

So keep the other column. At the end of each day, write down what you actually finished, including the unglamorous things: the meeting you prepared for, the fire you put out, the colleague you unblocked. It takes two minutes.

By Friday you'll have a page of evidence. It's useful for your weekly note, it's extremely useful at review time, and, honestly, it's the fastest cure there is for the "I did nothing this week" feeling — because you'll look at it and discover that you did quite a lot, it just wasn't on the list.

## 9. Know when it isn't a planning problem

One honest note to finish on. Everything above fixes a week that's got tangled — and most stale weeks are exactly that: a tangle, fixable in twenty minutes with a pen.

But if you run the reset properly, cut the list to fit, protect your blocks, send the weekly note for a month or two, and the gap between what's asked and what's possible *still* doesn't close, then it was never a planning problem. It's a capacity problem: too much work for one person. No planner fixes that, and no amount of personal discipline should be expected to. That's a conversation about headcount, scope, or priorities — and the notes you've been keeping are exactly the evidence you need to have it properly.

## The 20-minute reset

Don't wait for Monday. Do this today, in this order:

1. Dump everything onto one page. All of it, no sorting.
2. Sort into the five piles — and be ruthless with Delete and honest about Waiting.
3. Count your real available hours this week, then cut the list until it fits.
4. Book one ninety-minute block a day for the rest of the week.
5. Send the three-line note to your boss, and put a ten-minute Wednesday check-in in the calendar.

The workload won't vanish. But by Friday it'll be a list you chose, not a list that happened to you — and that's the whole difference between a stale week and a good one.

---

*Our weekly spreads have the capacity check, the waiting-on page and a done column built in — hyperlinked for GoodNotes and Notability.* [Browse the planners →](/shop)`

const POST_ROW = {
  title: 'The Stale Week: A Nagging Boss, a Growing Workload, and the Feeling That Nothing Is Working',
  slug: 'the-stale-week-workload-reset',
  excerpt:
    "You're busy from eight till six and you finish almost nothing. Your boss asks for an update and you don't have a good answer. Here's how to unstick a week that's gone stale.",
  body: BODY,
  cover_image: '/blog-content/stale-week-reset.webp',
  category: 'Weekly planning',
  tags: ['workload', 'weekly reset', 'managing up', 'overwhelm', 'prioritisation', 'productivity'],
  meta_title: 'The Stale Week: How to Reset a Workload That Keeps Growing',
  meta_description:
    'Why your to-do list keeps growing, how to cut it back to your real capacity, and the three-line weekly note that stops your boss chasing you for updates.',
  read_time_mins: 8,
  status: 'published',
  published_at: '2026-09-25T10:00:00Z',
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
