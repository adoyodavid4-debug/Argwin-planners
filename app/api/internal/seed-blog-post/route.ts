// TEMPORARY one-shot seeding endpoint — publishes a single hardcoded blog post,
// then this file is removed in the next commit. Guarded by the SHA-256 of a
// random 384-bit token generated at authoring time; the preimage never appears
// in the repo, so the route is inert to anyone reading this code.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '97fade827702c60e1f72b1bbc7940ac96f3c8ff24e8f8f74d8f4ee43feeacf89'

const BODY = `
Every job has one. The Friday numbers. The timesheet. The stock count. The inbox archaeology dig. The invoice run that somehow always lands on the one afternoon you had plans.

It's never hard. That's the annoying bit. If it were hard you'd respect it. Instead it's the beige task: too dull to enjoy, too important to skip, and somehow capable of hanging over your entire week like a cloud that never gets round to raining.

Here's the secret nobody tells you: **the task isn't the problem. Re-deciding it every week is.** When do I do it? Where's that file again? What did I do last time? Am I finished yet? You're paying a planning tax on something you've done fifty times. Let's cancel the subscription.

## 1. Give it a name and a house

"Sort out the numbers" is a ghost. It floats around your week, rattling chains. "**Thursday Numbers, 2pm**" is a task with a postcode.

Open your weekly spread and write it in as a fixed block, same day, same hour, every single week. Draw a little box round it if you're feeling fancy. The moment a task has a permanent home it stops asking to be renegotiated, and your brain quietly files it under "handled".

Bonus points for a proper name. Nobody dreads "The Thursday Tidy" or "Numbers o'Clock". They do dread "the report thing".

## 2. Put it in your worst hour

Boring work does not deserve your best brain. Your sharpest two hours of the day are for thinking, making, and the emails that need diplomacy. Your post-lunch fog? That's exactly where the timesheet belongs.

Find your lowest-energy slot that's still awake enough to press buttons, and park the task there. One rule: **never Friday at 4pm**. That's not a slot, that's a hostage situation.

## 3. Write the recipe once

The first ten minutes of any repeating task are spent remembering how you did it last time. That's ten minutes a week, forty a month, roughly a working day a year, spent reinventing your own wheel.

So next time, do the task with a pen in the other hand and write down *every* step, including the embarrassingly obvious ones. Give it a page of its own in your planner. From then on you're following a recipe, not composing one.

**Example recipe: Thursday Numbers**

- Open the shared "Weekly" folder (bookmark it, you animal)
- Export last week's figures from the dashboard
- Paste into the template, tab 2, don't touch tab 1
- Check the two totals match. If not, it's always the returns column
- Send to Amina with the subject line that's saved as a draft
- Rename the file, close the folder, **done**

## 4. Draw a finish line

Boring tasks expand to fill whatever time you give them, mostly because nobody ever decided what "finished" meant. Write one sentence at the top of your recipe page: *"Report sent, file renamed, folder closed."* That's the finish line. Cross it and you're allowed to stop.

Then time-box it. If it normally takes forty minutes, give it forty-five and set a timer. A visible countdown turns a shapeless chore into a game you can win.

> A task with no finish line is a task that follows you home.

## 5. Make it a game (yes, really)

Your brain is not above bribery. Neither is ours. A few ways to gamify a chore without it feeling like a corporate wellness poster:

- **The personal best.** Note how long it took at the bottom of your recipe page. Next week, try to beat it by two minutes. You'll be shocked how competitive you get with yourself.
- **The one-step trim.** Every week, ask: which step could I delete, template, or automate? A saved email draft here, a pre-filled spreadsheet there. In two months the task is half the size and you feel like a wizard.
- **The soundtrack rule.** Pick one album or playlist that only plays during this task. It becomes a Pavlovian cue: music on, brain switches to autopilot, hands do the thing.
- **The ridiculous reward.** A specific treat that exists only on the other side of the finish line. The good biscuit. The window desk. Ten minutes of guilt-free scrolling. Small, immediate, and yours.

**Temptation bundling: pick a pairing**

Behavioural scientists call it temptation bundling: pairing a thing you should do with a thing you want to do, and only allowing the second during the first. A few pairings our readers swear by:

- **The Playlist.** One album, one task. New album when you finish the tracker row.
- **The Fancy Coffee.** The oat-milk one you don't normally justify. Thursday only.
- **The Podcast Episode.** Save the one you're most excited about. It waits for the timesheet.
- **The Good Pen.** Yes, stationery people, we see you. The nice pen only comes out for ticking this box.

## 6. Tick it where you can see it

Give the task a row in your habit tracker: 52 tiny boxes, one per week. It sounds childish. It works like a charm. A run of green ticks quietly turns you into "someone who gets the dull thing done", and once you've got a streak going, breaking it starts to feel worse than just doing the task.

## 7. Batch its little cousins

Once the weekly task has a slot, look around it. Are there other five-minute chores loitering nearby? Expense receipts, updating the team tracker, archiving old threads? Sweep them into the same block. One dull hour a week beats seven dull interruptions, and there's a strange satisfaction in a single, glorious "admin hour" where you clear the whole lot and walk away clean.

## 8. Do a five-minute review before you leave

At the end of the block, before the biscuit, spend five minutes with your recipe page. Did a step change? Was anything slower than usual? Any new "always check the returns column" wisdom to add? Write it down while it's fresh. Next-week-you will be smug about it.

## The five-minute setup

Open your planner right now. Not tomorrow, now. Three things:

1. Block the same slot for the next four weeks and give the task a proper name.
2. Start a recipe page with every step you can remember, and one sentence for "done".
3. Add a row to your habit tracker and choose your bribe.

The task will still be boring. But it'll be small, predictable, forty minutes on a Thursday, and it'll be finished long before it gets a chance to loom over your week.

*Want a planner built for exactly this? Our weekly spreads, habit trackers and routine pages are hyperlinked for GoodNotes and Notability.* [Browse the planners →](/shop)
`.trim()

const BLOG_POST = {
  title: 'The boring one task at work occurring every week',
  slug: 'the-boring-one-task-at-work-occurring-every-week',
  excerpt:
    "You know the one. It takes forty minutes to do and five days to dread. Here's how to plan it once, shrink it, and make it a little bit fun.",
  body: BODY,
  cover_image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',
  category: 'Planning at work',
  tags: ['weekly planning', 'habits', 'routines', 'productivity'],
  meta_title: 'The boring one task at work occurring every week — Arwign Blog',
  meta_description:
    "That dull weekly task isn't going anywhere. Plan it once with a fixed slot, a recipe page, a finish line and a tracker row, and it stops looming over your whole week.",
  read_time_mins: 6,
  status: 'published',
  published_at: '2026-09-21T08:00:00Z',
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-seed-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('blog_posts')
    .upsert(BLOG_POST, { onConflict: 'slug' })
    .select('id, slug, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...data })
}
