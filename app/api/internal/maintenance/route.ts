// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Replaces the body/title/meta of the "self-care-wellness-routine-that-sticks"
// post with new content. Cover image, slug, publish date and status are left
// untouched. Guarded by the SHA-256 of a random 384-bit token.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '4c6e5b53b48a8311d4471b68146f55a5949521deb95e67616cbed4fd345d2757'
const SLUG = 'self-care-wellness-routine-that-sticks'

const BODY = `You've done this before. Sunday evening, full of resolve, you design the new regime: up at six, movement every morning, proper lunches, no screens after nine, journalling, water, the lot. It's beautiful. It lasts eleven days.

Then a deadline lands, you sleep badly, and by Thursday the whole thing is gone — not gradually, but all at once, because these systems are built as a single fragile block and the moment one piece fails the rest collapses with it. Then comes the bit that does the real damage: you decide the problem is you.

It isn't. The routine was badly designed. It assumed a version of your life with no emergencies in it, and that person doesn't exist. So let's design for the actual week — the one with the missed alarm and the three extra meetings.

## 1. Stop scheduling it last

Here's the structural error underneath almost every failed attempt: self-care gets treated as a **reward for finishing everything else**. Do the work, clear the inbox, handle the family thing, and then — if there's time — go for the walk.

There is never time. The work is never finished. That's not a scheduling accident, it's the nature of work: it expands to fill whatever space you leave it. So anything parked at the end of the queue is effectively cancelled.

The fix is unglamorous. Move it to the front. Put the twenty-minute walk in the calendar before the day fills up, the same way you'd put in a meeting you can't move. Not because a walk is more important than your job, but because it's the only version of the walk that ever actually happens.

> Anything you do only when everything else is finished is something you have quietly decided not to do.

## 2. Give every habit two sizes

This is the single change that turns a routine from fragile to durable, and almost nobody does it.

For each habit, write down two versions: the **full version** for a normal week, and the **floor version** — the smallest thing that still counts, doable on the worst day you can imagine. The floor should be almost embarrassingly small. That's the point. It's not the goal, it's the thing that stops the chain breaking.

| Habit | Full version | Floor version |
| --- | --- | --- |
| Movement | 45-minute class or a proper run | Walk to the end of the road and back |
| Stillness | 20 minutes, phone in another room | Three slow breaths before opening the laptop |
| Eating | Cooked properly, sat at a table | Eat something that isn't from a vending machine |
| Wind-down | Screens off at nine, read in bed | Phone charges outside the bedroom |
| Connection | Dinner with a friend | One message to one person you miss |

On a good week you do the middle column. On a brutal week you do the right one and it still counts — you haven't failed, you've run the floor version. The identity stays intact, which matters enormously, because the thing that ends most routines isn't a missed day. It's deciding that a missed day means you're not the kind of person who does this.

## 3. Never miss twice

Follow that with the only streak rule worth keeping: **missing once is an accident, missing twice is the start of a new pattern.**

Perfect streaks are a trap. Forty days in you miss one, the chain is "ruined", and the whole thing gets abandoned over a single evening. So don't count perfect days. Just refuse to miss two in a row. Missed Monday's walk? Tuesday's is now non-negotiable, even if it's the floor version to the end of the road.

This one rule is worth more than any amount of motivation, because it turns every stumble into a one-day event instead of a verdict.

## 4. Anchor it to something that already happens

New habits attached to a time of day ("I'll stretch at 7pm") are competing with whatever else happens to be going on at 7pm, and losing. New habits attached to an existing, reliable habit inherit its reliability.

So find the things you already do without fail — the kettle, the commute, the school run, closing the laptop — and hang the new thing off them:

> After **[something I already do every day]**, I will **[the small new thing]**.

- **After I put the kettle on,** I'll fill a glass of water and drink it while it boils.
- **After I close the laptop,** I'll take a ten-minute walk before I go inside.
- **After I brush my teeth at night,** I'll put the phone on the hall shelf.
- **After the Monday team call,** I'll block Wednesday's lunch hour as actual lunch.

Write them in that exact sentence shape in your planner. It looks almost too simple to matter. It's the difference between a habit that has a home and one that's floating loose hoping you'll remember it.

## 5. Pick one thing. One.

The eleven-day collapse has a cause, and it's usually that you started six habits at once. Six new habits means six chances to fail, and they're load-bearing on each other, so the first one that goes takes the rest with it.

Choose one. Run it for a month until it's boring and automatic — until it feels like brushing your teeth rather than a project. Then add the next. Yes, this means your grand routine takes six months to build instead of a weekend. It also means you'll still have it in June, which the weekend version won't be.

If you can't decide which one: **pick sleep**. Almost everything else gets easier downstream of it, and almost everything else gets harder without it.

## 6. Match the rest to the kind of tired you are

Here's why a weekend of lying down can leave you feeling no better. Rest isn't one thing, and the default rest — collapsing in front of a screen — only treats one kind of tired, and not very well.

- **Body tired** *(heavy, achy, dragging)* — actual sleep. Sitting down properly. Gentle movement rather than none; a slow walk often beats the sofa.
- **Brain tired** *(full head, can't decide anything)* — empty it onto paper. Then do something with your hands: cooking, tidying, the garden. Not more input.
- **People tired** *(talked out, no words left)* — solitude, deliberately taken and not apologised for. Or, if it's the lonely kind, one person — not a crowd.
- **Senses tired** *(noise, screens, notifications, glare)* — quiet and dim. No podcast on the walk. A few minutes with nothing coming in at all.

Before you flop, ask which one you are. Brain-tired treated with three hours of scrolling stays brain-tired, which is why you can rest all evening and wake up feeling like you didn't. Naming it takes five seconds and usually points straight at what would actually help.

## 7. Make it easier than not doing it

Willpower is a terrible mechanism — expensive, unreliable, and completely gone by six in the evening. Friction is a much better one, and you can design it the night before while you still have some.

- **Reduce friction for the good thing.** Shoes and kit by the door. Bottle filled and on the desk. Book on the pillow. Walking route already decided, so there's no deciding to do at the point of tiredness.
- **Add friction to the thing that eats it.** Phone charging in another room. The app logged out. The TV remote in a drawer. You don't need to resist forever — twenty seconds of inconvenience is usually enough to break the automatic reach.

The rule of thumb: make the good option about thirty seconds easier and the bad option about thirty seconds harder. That's a tiny margin, and it decides most evenings.

## 8. Saying no is part of the routine

The part that never makes it onto the pretty checklist: you cannot add rest to a week that's already overfull. Something has to give, and if you don't choose it, the rest is what gives.

So the boundary work counts as the routine. Leaving the meeting that doesn't need you. Not answering the message at eleven at night. Saying "I can't this weekend" without constructing an elaborate justification for it. Declining the thing you'd have said yes to out of habit.

None of that is glamorous and none of it feels like self-care in the moment. It's the part that makes everything else possible.

## 9. About the "selfish" bit

The guilt is worth addressing directly, because it's usually what's underneath a routine that keeps not happening.

If you're the reliable one — at work, at home, in your family — taking an hour for yourself can feel like theft from people who need you. So here's the plain version: everyone depending on you is depending on you being *functional*. Tired you is slower, shorter-tempered and worse company. The hour you take isn't taken from them; it's most of what they get from you for the rest of the week.

And beyond the usefulness argument — you're allowed to be a person whose wellbeing counts, not just a resource other people draw on. That shouldn't need to be justified by productivity, but if the productivity framing is what gets you out for the walk this week, use it. Whatever works.

## 10. Review it monthly, not daily

Don't judge the routine on Wednesday. Wednesday is noise. Look at it once a month with two questions: **what actually happened, and what do I want to change?**

Some habits will have quietly embedded themselves and can come off the tracker entirely. Some will have failed every week, and that's information, not a character flaw — usually it means the anchor was wrong, the floor version was still too big, or you didn't really want it and were doing someone else's routine.

Drop that one without ceremony. A routine you'll actually keep is worth far more than the impressive one you keep restarting.

And one honest note to end on: this is all habit design, and habit design handles the ordinary friction of a busy life. If rest isn't restoring you no matter how you arrange it, or things have felt heavy for a long stretch, that's worth talking to a doctor or another professional about. No planner is the right tool for that, and it's not a failure of routine.

## The ten-minute setup

Not a new regime. Just this, tonight:

1. Pick *one* habit. Only one. If you can't choose, choose sleep.
2. Write both sizes: the full version, and a floor version small enough for your worst day.
3. Anchor it — "after [thing I already do], I will [the small thing]" — and write that sentence down.
4. Remove thirty seconds of friction tonight: kit out, bottle filled, phone out of the bedroom.
5. Write "never miss twice" at the top of the page, and diarise a review for a month from now.

One habit, two sizes, one anchor. It's a much smaller plan than the beautiful one — which is exactly why it'll still be running when the beautiful one would have been abandoned in week two.

---

*Our wellness and weekly planners have habit trackers, routine pages and rest-planning spreads built in — hyperlinked for GoodNotes and Notability.* [Browse the planners →](/shop)`

const PATCH = {
  title: "Self-Care Isn't Selfish: Building a Wellness Routine That Sticks",
  excerpt: "Most wellness routines don't fail because you lack discipline. They fail because they were designed for your best week and you have to live them in your worst one.",
  body: BODY,
  category: 'Routines',
  tags: ['self care', 'wellness routine', 'habits', 'habit tracker', 'rest', 'weekly routine'],
  meta_title: 'How to Build a Self-Care Routine That Actually Sticks',
  meta_description: 'A habit-design approach to self-care: give every habit two sizes, never miss twice, anchor it to something you already do, and match your rest to the kind of tired you actually are.',
  read_time_mins: 8,
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-maint-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Read cover first so we can confirm it is preserved unchanged.
  const { data: before, error: readErr } = await db
    .from('blog_posts').select('id, cover_image').eq('slug', SLUG).single()
  if (readErr || !before) return NextResponse.json({ error: readErr?.message ?? 'post not found' }, { status: 500 })

  const { data, error } = await db
    .from('blog_posts').update(PATCH).eq('slug', SLUG)
    .select('slug, cover_image, category, read_time_mins').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: data, coverUnchanged: before.cover_image === data.cover_image })
}
