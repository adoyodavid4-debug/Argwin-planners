// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Publishes 10 new blog posts (idempotent upsert on slug). Bodies use the
// blog Markdown renderer's supported syntax; [link] placeholders are resolved
// to real storefront URLs, and product references that don't exist in the
// catalogue point at the closest real collection.
// Guarded by the SHA-256 of a random 384-bit token.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '2d7d228d213aa49e561e6a375cd9cc0939c1edcef673fbe5dd905bbdd00c6f89'

type Post = {
  title: string; slug: string; excerpt: string; body: string; cover_image: string
  category: string; tags: string[]; meta_title: string; meta_description: string
  read_time_mins: number; status: 'published'; published_at: string
}

const POSTS: Post[] = [
  {
    title: 'How to Set Up a Digital Planner in GoodNotes (and Actually Keep Using It)',
    slug: 'how-to-set-up-digital-planner-goodnotes',
    excerpt: 'Set up your digital planner in GoodNotes in ten minutes, and learn the three small habits that keep you using it past February.',
    cover_image: '/blog-content/goodnotes-setup.webp',
    category: 'Digital Tools',
    tags: ['goodnotes', 'digital planner', 'ipad', 'planning habits', 'setup'],
    meta_title: 'How to Use a Digital Planner in GoodNotes — Arwign Blog',
    meta_description: 'Set up your digital planner in GoodNotes in ten minutes, and learn the three small habits that keep you using it past February.',
    read_time_mins: 6,
    status: 'published',
    published_at: '2026-09-25T20:00:00Z',
    body: `Most planners don't fail in December. They fail on a quiet Tuesday in late January, when the novelty has worn off, the pages are still pristine, and the planner has quietly become one more thing you feel guilty about.

Digital planners are meant to fix that. They live on the device you already carry, they never run out of pages, and a single tap takes you from your year to your week. But only if you set them up properly on day one. This guide takes about ten minutes, and it's the difference between a planner you admire and a planner you use.

## Step 1: Import it the right way

When you buy a hyperlinked planner, you'll download a PDF. Don't just open it in your Files app, because that view doesn't support handwriting or tabs.

1. Open the PDF on your iPad, tap the **Share** icon, and choose **Open in GoodNotes**.
2. When GoodNotes asks, select **Import as new document**.
3. Give it a clear name, like "2027 Planner" rather than "planner_final_A5_v2".

If you prefer Notability, the process is the same. Share the file and choose Notability instead.

## Step 2: Switch to read-only mode to test your links

This is the step almost everyone misses. In GoodNotes, links only respond when you're **not** in writing mode. Tap the pen icon to toggle it off, then tap a tab or a date. You should jump straight to that page.

Spend two minutes tapping around: the year view, a month, a week, a tracker. Every Arwign planner is hyperlinked throughout, so you should never need to scroll through hundreds of pages to find today.

## Step 3: Choose your one "home" page

Every planner has a page you'll return to most often. For some people it's the weekly spread; for others, the daily page. Decide which is yours, then bookmark it with the ribbon icon in GoodNotes.

Now, when you open the planner, you land where you actually work. Friction is the quiet enemy of every good habit, and this removes most of it.

## Step 4: Set up your pens once

Pick three pens and stick with them:

- **A dark pen** for writing (black or deep brown)
- **An accent colour** for anything important
- **A highlighter** for things that are done

Save them as favourites. Fewer choices means faster, calmer planning, and pages that look intentional rather than chaotic.

## The three habits that keep you planning past February

Setup is the easy part. Here is what separates people who plan from people who own planners.

**1. Plan at the same moment every week.** Choose a trigger you already have, such as Sunday tea or the Monday commute. Ten minutes, same time, every week. Consistency beats intensity.

**2. Lower the bar for a "good" day.** A planned day doesn't need a colour-coded schedule. Three priorities, written down, is a win. If you only open the planner to tick one thing off, that still counts.

**3. Never restart. Just resume.** Missed a week? Don't redo the month or buy a new planner. Tap to today and carry on. This is the quiet superpower of a digital planner: blank pages don't stare at you, and there's no crumpled paper to prove you fell off.

## Why hyperlinks change everything

A paper planner asks you to flip. A basic PDF asks you to scroll. A properly hyperlinked planner lets you think in the same way your mind moves: from the big picture to today and back again, in a single tap.

That's why every Arwign planner is built with linked tabs, linked calendars and linked trackers, in A4, A5 and US Letter, so it fits whichever device you use. We test every link before a planner is released, because a planner that doesn't flow simply won't get used.

## Your next step

If you already have a planner, open it now and do Steps 1 to 3. It will take less time than your next cup of tea.

If you're still looking for the right one, **[browse the Arwign Planners collection](/shop)**. Each planner has one clear purpose, a calm design, and links that work the first time you tap.`,
  },
  {
    title: 'ADHD-Friendly Planning: Why Traditional Planners Fail You, and What Works Instead',
    slug: 'adhd-friendly-planning-what-works',
    excerpt: "If every planner you've bought ends up abandoned, the problem isn't you. Here's how to plan in a way that works with an ADHD brain.",
    cover_image: '/blog-content/adhd-planning.webp',
    category: 'Neurodivergent Planning',
    tags: ['adhd planner', 'neurodivergent', 'focus', 'executive function', 'planning'],
    meta_title: 'ADHD Planner: Why Traditional Planners Fail and What Works — Arwign Blog',
    meta_description: "If every planner you've bought ends up abandoned, the problem isn't you. Here's how to plan in a way that works with an ADHD brain.",
    read_time_mins: 7,
    status: 'published',
    published_at: '2026-09-25T19:00:00Z',
    body: `You've bought the beautiful planner. You've set it up with genuine hope. You've used it faithfully for eleven days. And now it sits on the shelf, or in a folder on your iPad, gently reminding you of another thing you didn't stick with.

If that sounds familiar, here is something worth hearing: **the planner failed you, not the other way round.**

Most planners are designed for a brain that runs on steady routine, remembers what it wrote yesterday, and feels the same amount of motivation on Thursday as it did on Monday. Many brains don't work like that, and ADHD brains especially don't. That isn't a flaw to fix. It's a design brief.

## Why traditional planners don't stick

**They assume every day looks the same.** A rigid hour-by-hour grid makes a bad day feel like a failed page. And once a page feels failed, the whole planner starts to feel heavy.

**They ask too much before they give anything back.** Long setup, many sections, rules about how to fill them in. By the time you've finished setting up, the energy you had for planning is spent.

**They're out of sight.** A paper planner in a drawer might as well not exist. Out of sight, out of mind isn't a cliché for many ADHD brains. It's Tuesday.

**They punish gaps.** Skip three days and you're met with three blank pages. Many people stop at that point, not from laziness but from shame.

## What actually works

There's no single perfect system, but a few principles make a real difference.

**1. Capture first, organise later.** Your brain generates ideas faster than any system can file them. The first job of a planner is to be a safe place to dump everything, quickly, so your mind can stop holding it.

**2. Plan for your real energy, not your ideal energy.** Some days you can do ten things. Some days, getting dressed is the win. A good planner has room for both without judgement.

**3. Make the next step tiny.** "Sort out taxes" is a fog. "Find last year's tax email" is a step. The smaller the step, the easier it is to start, and starting is usually the hardest part.

**4. Keep it visible.** A digital planner on the tablet or phone you already pick up fifty times a day is far harder to forget than a book in a bag.

**5. Design for restarts.** You will have gaps. Everyone does. The best planners let you pick up on today without facing a wall of empty pages.

## How we built the Arwign Neurodivergent Collection

We didn't start with a layout. We started with the moments when planning falls apart: too many thoughts at once, a mountain of tasks that feels impossible to climb, a day with nothing left in the tank.

Then we built a planner for each one:

- **Open Tabs** — for the moments when your mind has twenty things open at once
- **The First Five Minutes** — for turning one huge, frozen task into a first small step you can actually take
- **Big Feelings, Small Steps** — for the days when emotions are big and action needs to be small
- **Running on Empty** — for planning around low energy honestly
- **The Spoon Ledger** — for tracking the energy you have, and spending it on what matters
- **The Rejection File** — for processing the sting of "no" and keeping your perspective

Each one is focused, calm to look at, and hyperlinked so you can reach any page in a tap, never a long scroll.

## A gentle note

A planner is a tool, not a treatment. If you're finding day-to-day life hard, talking to a GP or a qualified professional is always worthwhile. But the right tool, one built with your brain in mind, can make ordinary days feel a lot more manageable.

## Your next step

Pick the one moment that trips you up most. Is it starting? Remembering? Running out of energy by lunchtime? Then choose the planner built for that moment.

**[Explore the Neurodivergent Collection](/shop/category/adhd-planners)**, and try planning in a way that finally feels like it was made for you.`,
  },
  {
    title: 'The Spoon Theory, Explained: How to Plan a Week When Your Energy Runs Low',
    slug: 'spoon-theory-planning-low-energy-week',
    excerpt: "Spoon theory is a simple way to plan around limited energy. Here's what it means, and how to use it to build a kinder, more realistic week.",
    cover_image: '/blog-content/spoon-theory.webp',
    category: 'Wellness',
    tags: ['spoon theory', 'energy', 'chronic illness', 'wellness', 'pacing'],
    meta_title: 'Spoon Theory Planning: Plan a Week Around Low Energy — Arwign Blog',
    meta_description: "Spoon theory is a simple way to plan around limited energy. Here's what it means, and how to use it to build a kinder, more realistic week.",
    read_time_mins: 7,
    status: 'published',
    published_at: '2026-09-25T18:00:00Z',
    body: `Most productivity advice quietly assumes one thing: that you have a full tank every morning. Wake up, drink your coffee, and the day is yours to conquer.

But for a great many people, energy isn't a given. It's a budget. And when you plan as if it were unlimited, the week tends to end the same way: exhausted, behind, and wondering why you "couldn't just do it".

There's a better way to think about it, and it starts with a handful of spoons.

## Where spoon theory comes from

Spoon theory was first described by the writer Christine Miserandino, who was trying to explain to a friend what daily life was like with a chronic illness. She handed her friend a bunch of spoons and asked her to talk through an ordinary day. Every activity cost a spoon: getting up, showering, getting dressed, travelling to work. By early afternoon, her friend had almost none left, and the day was far from over.

The idea spread because it gives words to something many people feel but struggle to explain: **energy is limited, every task has a cost, and some days you start with fewer spoons than others.** Since then, people living with chronic illness, disability, burnout and neurodivergence have all found it useful.

## Why it works for planning

A normal to-do list only asks: *what needs doing?*

A spoon-aware plan asks two more questions: *how much will this cost me?* and *how much do I have today?*

That small shift changes everything. Instead of cramming ten tasks into Tuesday and blaming yourself when you manage four, you plan the four that matter most and protect enough energy to recover.

## How to plan a spoon-aware week

**1. Check in before you plan.** At the start of each day, or your week, estimate your spoons honestly. Not what you *should* have. What you actually have.

**2. Give tasks a cost.** Next to each task, note roughly how many spoons it takes: a phone call might be two, a supermarket run three, answering one email one. Costs are personal; a task that's easy for someone else may be expensive for you, and that's fine.

**3. Spend on what matters most.** Put your essentials first: the things that truly can't wait, and the things that restore you. Everything else is optional.

**4. Leave a reserve.** Always keep one or two spoons back. Life has a way of adding surprise costs, and running at zero is how a hard day becomes a hard week.

**5. Notice the patterns.** Over a few weeks, you'll see which tasks drain you most, which days are heavier, and what gives you spoons back. That knowledge is priceless.

## The kindest part

Spoon planning isn't about doing less for the sake of it. It's about doing what you can **without borrowing from tomorrow.** When you stop spending energy you don't have, you have more good days, and fewer crashes.

It also changes the way you speak to yourself. "I didn't get it done" becomes "I spent my spoons on what mattered today." That isn't an excuse. It's accurate.

## Built for this: The Spoon Ledger

We designed **The Spoon Ledger** to make spoon-aware planning simple, rather than one more thing to manage. It gives you space to check in on your energy, weigh up what each day asks of you, and look back over time to spot what drains you and what restores you. And for the weeks when the tank is especially low, **Running on Empty** helps you plan around your bare essentials, gently and without guilt.

Both are hyperlinked digital planners for GoodNotes and Notability, so the right page is always a tap away, which matters when you haven't got the energy for scrolling.

## Your next step

Tonight, before bed, count your spoons for tomorrow. Write down just three things you'll spend them on. That's it. That's the whole practice.

When you're ready for a planner that works this way every day, **[meet The Spoon Ledger](/shop/the-spoon-ledger)**.

*This post is for general information and planning. If you're dealing with persistent fatigue, it's always worth speaking to a GP or healthcare professional.*`,
  },
  {
    title: 'A Simple Budget System You Can Run From Your iPad (in 20 Minutes a Month)',
    slug: 'simple-budget-system-ipad',
    excerpt: "Budgeting doesn't need complicated spreadsheets. Here's a calm, four-part system you can run from your iPad in about twenty minutes a month.",
    cover_image: '/blog-content/budget-ipad.webp',
    category: 'Finance',
    tags: ['budget planner', 'money', 'saving', 'sinking funds', 'digital budgeting'],
    meta_title: 'A Simple Digital Budget Planner System for iPad — Arwign Blog',
    meta_description: "Budgeting doesn't need complicated spreadsheets. Here's a calm, four-part system you can run from your iPad in about twenty minutes a month.",
    read_time_mins: 7,
    status: 'published',
    published_at: '2026-09-25T17:00:00Z',
    body: `Most people don't avoid budgeting because they're bad with money. They avoid it because every system they've tried felt like homework: a spreadsheet with forty tabs, an app that sends anxious notifications, a method that works beautifully until the first unexpected bill.

A budget should do the opposite. It should make money feel **quieter**. Here's a simple system that does exactly that, and it fits comfortably on the iPad you already own.

## Part 1: Know your number

Before you plan anything, you need one honest figure: **what actually comes in each month.** Take-home, after deductions, not the salary on your contract.

If your income varies, because you freelance or run a side business, use the lowest month from the past six. Planning on your worst month means every better month feels like a bonus rather than a relief.

## Part 2: Give every pound a job

Split your money into four simple buckets:

- **Fixed essentials:** rent, bills, transport, loan repayments
- **Flexible essentials:** food, household, fuel
- **Future you:** savings, sinking funds, investments
- **Life:** eating out, gifts, hobbies, small joys

The goal isn't to squeeze the last bucket to nothing. A budget with no room for joy is a budget you'll abandon. The goal is to **choose** where your money goes before the month chooses for you.

## Part 3: Sinking funds, the secret weapon

Most budgets break because of expenses that aren't monthly but aren't surprises either: car servicing, school fees, birthdays, annual subscriptions, the holiday you take every year.

A sinking fund solves this. Take the yearly cost, divide by twelve, and set that amount aside every month. When the bill arrives, the money's already waiting.

One sinking-fund tracker can do more for your peace of mind than any amount of willpower.

## Part 4: The 20-minute monthly reset

Once a month, sit down with a cup of tea and your planner, and do four things:

1. **Look back:** where did the money actually go? No judgement, just noticing.
2. **Adjust:** move money between buckets if last month taught you something.
3. **Top up:** move your sinking-fund and savings amounts across.
4. **Look ahead:** note any big costs coming in the next three months.

That's it. Twenty minutes, once a month. Small, regular attention beats occasional panicked overhauls every single time.

## Why a digital planner beats a spreadsheet for this

Spreadsheets are powerful, but they're built for analysis, not reflection. A planner lets you **write** your numbers, which makes you slow down and actually notice them. It gives you space for notes like "that was the week of the wedding", which no formula can capture.

And with a hyperlinked digital planner, you get the best of both: handwritten calm, with instant navigation from your yearly overview to this month's tracker in a tap.

## Meet the Arwign budget planners

Our budget collection is built around exactly this system: monthly budgets, spending trackers, sinking funds, savings goals and debt payoff pages, all linked together so nothing gets lost. Each one is designed to feel warm and calm rather than clinical, because the way a page looks changes how willing you are to open it.

They're available in A4, A5 and US Letter, for GoodNotes and Notability.

## Your next step

This weekend, work out your one honest number from Part 1. Just that. It's the foundation for everything else.

When you're ready to build the rest, **[explore the Arwign budget planners](/shop/category/budget-planners)**, and let your money finally feel a little quieter.

*This post shares general budgeting ideas, not personal financial advice. For advice specific to your situation, speak to a qualified financial adviser.*`,
  },
  {
    title: 'From Hobby to Income: A 12-Month Plan for Solo Creatives',
    slug: 'hobby-to-income-plan-solo-creatives',
    excerpt: "Turning your craft into income takes more than talent. Here's a calm, month-by-month plan for building a creative business that lasts.",
    cover_image: '/blog-content/hobby-to-income.webp',
    category: 'Creative Business',
    tags: ['creative business', 'side hustle', 'pricing', 'solo creative', 'small business'],
    meta_title: 'How to Turn Your Hobby Into a Business: A 12-Month Plan — Arwign Blog',
    meta_description: "Turning your craft into income takes more than talent. Here's a calm, month-by-month plan for building a creative business that lasts.",
    read_time_mins: 8,
    status: 'published',
    published_at: '2026-09-25T16:00:00Z',
    body: `There's a moment many makers remember clearly. Someone admires what you've made, and then asks, "Do you sell these?"

It's thrilling. It's also the start of a question that can take years to answer well: *how do I turn something I love into something that pays, without losing the love along the way?*

The good news is that most creative businesses don't fail for lack of talent. They fail for lack of **structure**. Here's a simple way to build it, one year at a time.

## First, the mindset shift

A hobby answers to you. A business answers to customers, deadlines and numbers. That sounds cold, but it doesn't have to be. Structure is what protects your creative energy, because when the admin has a place to live, your head is free to make things.

Think of the next twelve months in three layers: **foundations**, **the operating year**, and **money**. Everything below fits into one of those.

## Months 1–2: Lay the groundwork

Before you sell more, get clear on:

- **What you make, and for whom.** "Handmade jewellery" is a category. "Minimal brass earrings for women who dress simply" is a business.
- **What makes yours different.** Your story, your materials, your process. Write it down in one paragraph.
- **Where you'll sell.** One or two channels done well beats six done badly.
- **Your non-negotiables.** How many hours a week you'll give it. What you won't compromise on.

## Months 3–4: Price properly

This is where most creatives undersell themselves. A fair price covers:

- Materials
- Your time, at an hourly rate you'd actually accept
- Overheads: tools, fees, packaging, platform charges
- A profit margin, because a business that only breaks even can't grow

If the resulting price scares you, that's normal. Test it anyway. The right customers are paying for the value, not the cost.

## Months 5–8: Build a rhythm

Now the business needs a heartbeat: a weekly and monthly routine you can sustain.

- **Weekly:** make, list, post, reply, ship. Block time for each, rather than doing everything every day.
- **Monthly:** review what sold, what didn't, and what people asked about.
- **Quarterly:** plan one launch, collection or campaign. Momentum comes from moments.

## Months 9–10: Know your numbers

You can't grow what you can't see. Track, every month:

- Revenue, and where it came from
- Costs, grouped simply
- Profit, which is the number that really matters
- Money set aside for tax, before you spend anything else

## Months 11–12: Review and decide

At the end of the year, look back honestly. What would you keep? What would you stop? What would you double? A good year-end review turns one year of experience into a much better next year.

## Planners for the creative business

Our business collection is built for exactly this journey — turning a craft into income without losing the love along the way:

- **SHOW UP.** — for building the consistent rhythm of making, listing and posting
- **PAID.** — for tracking pitches, deliverables and payments as the work comes in
- **WHAT WORKS.** — for reading your numbers and doing more of what sells

Each is a hyperlinked digital planner for GoodNotes and Notability, designed to feel warm rather than clinical.

## Your next step

Write one sentence: *"I make ___ for ___."* If you can't fill it in yet, that's your month-one work.

When you're ready to build the whole year, **[explore the business planners](/shop/category/business-planners)**.`,
  },
  {
    title: 'How Much Should You Set Aside for Tax as a Freelancer? A Calm, Simple Method',
    slug: 'how-much-set-aside-tax-freelancer',
    excerpt: 'Never be caught out by a tax bill again. A simple set-aside method for freelancers and creatives, plus the habits that make it automatic.',
    cover_image: '/blog-content/freelancer-tax.webp',
    category: 'Finance',
    tags: ['freelance tax', 'self-employed', 'money', 'set-aside', 'creative business'],
    meta_title: 'How Much to Set Aside for Tax as a Freelancer — Arwign Blog',
    meta_description: 'Never be caught out by a tax bill again. A simple set-aside method for freelancers and creatives, plus the habits that make it automatic.',
    read_time_mins: 6,
    status: 'published',
    published_at: '2026-09-25T15:00:00Z',
    body: `There's a particular kind of dread that only self-employed people know. It arrives with an official envelope or email, and a number you weren't quite ready for.

The frustrating thing is that the money was there. It came in over the year, in dozens of payments. It just didn't stay put.

The fix isn't earning more or understanding every line of tax law. It's a simple habit: **treat part of every payment as never having been yours.**

## Step 1: Choose your percentage

Tax rules differ from country to country, and they depend on your income, your expenses and your circumstances. So there's no single right number for everyone.

What many freelancers do is choose one fixed percentage to set aside from every payment. A figure somewhere between 20% and 30% is a common starting point, but the right number for you depends on where you live and how much you earn.

The best way to find it: look up your country's current rates for self-employed income, or spend an hour with an accountant once. It's one of the best-value hours you'll ever pay for.

If in doubt, **round up.** Having too much set aside is a pleasant surprise. Having too little is not.

## Step 2: Separate it immediately

The single most important rule: **move the tax money the day you're paid.** Not at the end of the month. Not when you remember. The day it lands.

Ideally, keep it in a separate savings account you don't touch for anything else. If it's sitting in your everyday account, it will quietly get spent. Not through carelessness, but because money in view feels like money available.

## Step 3: Track what you set aside

Keep a simple log for every payment:

- Date
- Client or source
- Amount received
- Amount set aside for tax
- Running total in your tax pot

This takes thirty seconds per payment, and it means you always know exactly where you stand. No guessing, no end-of-year detective work.

## Step 4: Keep your receipts as you go

In many countries, legitimate business expenses can reduce what you owe. But only if you can show them. Log expenses monthly, not annually. A shoebox of faded receipts in the eleventh month is where good intentions go to die.

## Step 5: Do a quarterly check-in

Every three months, compare your tax pot with your income so far. Is your percentage still right? Did you have an unusually good quarter? Adjust early, and there are no surprises later.

## The real benefit: peace of mind

When your tax is already set aside, your income finally feels like *your* income. You can plan, spend and save without a background hum of worry. For many freelancers, that calm is worth more than any single invoice.

## Built for this: the budget & finance planners

Give your numbers a proper home. Our budget planners bring income and expense tracking, savings goals and a tax set-aside together into one calm, hyperlinked place, so you can see your whole financial picture at a glance and always know what's yours and what's the taxman's.

## Your next step

Pick your percentage today, even if it's a rough one. Then, the next time you're paid, move that amount before you do anything else.

When you want a proper home for your numbers, **[explore the budget planners](/shop/category/budget-planners)**.

*This post offers general information, not tax or financial advice. Tax rules vary by country and circumstance, so please check with a qualified accountant or your local tax authority.*`,
  },
  {
    title: 'Brand Deals 101: How to Track Pitches, Rates and Payments as a UGC Creator',
    slug: 'brand-deals-track-pitches-rates-payments-ugc',
    excerpt: "Brand deals can get messy fast. Here's a simple system to track every pitch, deliverable and payment, and look professional doing it.",
    cover_image: '/blog-content/ugc-brand-deals.webp',
    category: 'Creative Business',
    tags: ['ugc', 'brand deals', 'content creator', 'rates', 'invoicing'],
    meta_title: 'UGC Creator Brand Deals: Track Pitches, Rates & Payments — Arwign Blog',
    meta_description: "Brand deals can get messy fast. Here's a simple system to track every pitch, deliverable and payment, and look professional doing it.",
    read_time_mins: 7,
    status: 'published',
    published_at: '2026-09-25T14:00:00Z',
    body: `Your first brand deal feels like a milestone. Your fifth feels like a juggling act. By your fifteenth, you might be scrolling back through DMs at midnight trying to remember whether that invoice was paid, which draft they approved, and whether you're allowed to reuse the footage.

The creators who grow steadily aren't always the most talented. They're the most **organised**. Brands notice who delivers on time, remembers the brief, and invoices cleanly, and those are the creators they book again.

Here's how to become one of them.

## 1. Treat every pitch as a record

Whether you're pitching or being pitched, log it the moment it starts:

- Brand name and contact
- Where the conversation happened (email, DM, agency)
- What they want
- Date and status: pitched, negotiating, confirmed, declined

A simple pipeline turns a chaotic inbox into a clear view of what's coming. It also shows you your conversion rate, which is gold when you're deciding where to focus.

## 2. Know your rates before anyone asks

The weakest moment in any negotiation is being asked "What's your rate?" and having no answer ready.

Build a simple rate card for yourself, covering:

- **Base content:** one video, one set of photos
- **Add-ons:** extra hooks, raw footage, rush turnaround
- **Usage rights:** paid ads, time periods, platforms
- **Exclusivity:** not working with competitors for a set time

Usage and exclusivity are where many new creators leave money on the table. If a brand wants to run your content as an ad, that's worth more than organic use. Price it that way.

## 3. Capture the brief in one place

For each confirmed deal, write down exactly what was agreed: deliverables, formats, key messages, dos and don'ts, deadlines and number of revisions. When a brand comes back asking for "one more version", you'll know whether that's included or extra.

## 4. Track deliverables like a pro

A clear deliverables tracker shows, at a glance, what's due, what's in draft, what's awaiting approval and what's live. Nothing slips, and you never have to send the dreaded "sorry, when was this due?" email.

## 5. Follow the money, all of it

Payment is where things most often fall through the cracks. For every deal, log:

- Invoice number and date sent
- Amount and currency
- Payment terms (30 days, on delivery)
- Date paid

Then check it weekly. A polite follow-up on day 31 is professional. Discovering an unpaid invoice six months later is painful.

## 6. Review what's working

Once a quarter, look back: which brands paid best, which were easiest to work with, which content types you enjoyed most. That's how you move from taking every deal to choosing the right ones.

## Built for creators: PAID.

We created **PAID.** as a dedicated brand-deal and UGC planner, so every pitch, brief, deliverable and payment has a proper home. It's a 180-page hyperlinked digital planner, designed to make you feel as professional behind the scenes as you look on camera.

Pair it with **WHAT WORKS.**, our social media analytics planner, and you'll have your deals and your data side by side, which is exactly what you need when a brand asks for your numbers.

## Your next step

Open your notes app and list every active brand conversation. Just the names and statuses. You'll feel lighter immediately.

When you're ready for a system that grows with you, **[explore PAID.](/shop/paid)**.`,
  },
  {
    title: 'Stop Guessing: The 5 Social Media Metrics That Actually Matter',
    slug: 'social-media-metrics-that-matter',
    excerpt: 'Followers and likes feel good, but they rarely tell you what\'s working. Here are the five metrics that do, and how to track them simply.',
    cover_image: '/blog-content/social-metrics.webp',
    category: 'Creative Business',
    tags: ['social media', 'analytics', 'metrics', 'content strategy', 'creators'],
    meta_title: 'The 5 Social Media Metrics That Actually Matter — Arwign Blog',
    meta_description: 'Followers and likes feel good, but they rarely tell you what\'s working. Here are the five metrics that do, and how to track them simply.',
    read_time_mins: 6,
    status: 'published',
    published_at: '2026-09-25T13:00:00Z',
    body: `Every platform gives you a dashboard full of numbers. Views, impressions, reach, likes, follows, taps, watch time, profile visits. It's easy to spend twenty minutes scrolling through them and come away knowing exactly nothing more about what to post tomorrow.

The problem isn't a lack of data. It's too much of it, with no way to tell which numbers matter.

Here are the five that do.

## 1. Saves and shares: the real vote of confidence

A like takes a split second. A save means *"I want to come back to this."* A share means *"Someone I know needs to see this."*

These are the clearest signals that your content is genuinely valuable, and they tend to tell you more about what's working than likes alone. If a post gets fewer likes but far more saves, that's the one to learn from.

## 2. Watch time and retention: are people staying?

For video, the question isn't just "how many watched?" It's "how long did they stay?" Look at where viewers drop off. If most leave in the first two seconds, your opening needs work. If they leave halfway, the middle is dragging.

This one number can improve your videos faster than any trend.

## 3. Engagement rate: size-adjusted success

Raw numbers flatter big accounts and punish small ones. Engagement rate levels the field: interactions divided by the people who saw the post.

Track it over time, not in isolation. A rising engagement rate on a small account is often a stronger sign of health than a flat one on a large account. It's also one of the first things many brands look at.

## 4. Follower growth from content, not just totals

Your total follower count is a scoreboard. What matters is **which posts brought new people in.** When a particular topic or format consistently converts viewers into followers, you've found something worth repeating.

## 5. Clicks and conversions: does it lead anywhere?

If your content is meant to sell, sign people up or send them somewhere, then link clicks and conversions are the bottom line. Beautiful engagement with zero clicks might mean your call to action is missing, or buried.

## How to actually track this (without living in dashboards)

You don't need to check daily. In fact, you shouldn't. Daily numbers swing wildly and feed anxiety rather than insight.

Instead:

1. **Log once a week.** Pick your five numbers and record them for your top posts.
2. **Compare, don't obsess.** Look at trends over weeks, not individual days.
3. **Write one lesson.** Each week, note one thing the numbers taught you. "Carousels saved more than reels" is worth more than a hundred screenshots.
4. **Turn lessons into plans.** Your next week's content should be shaped by last week's lesson.

Over time, you'll build something no algorithm can take away: a clear understanding of your own audience.

## Built for this: WHAT WORKS.

**WHAT WORKS.** is our 180-page social media analytics planner. It gives these five metrics, and the lessons behind them, a proper home: weekly logs, post reviews, content experiments and monthly reflections, all hyperlinked for quick navigation in GoodNotes and Notability.

It's designed for creators who want to make decisions from evidence, not from gut feeling and guesswork.

## Your next step

This week, find your three most-saved posts from the past month. What do they have in common? That's your first lesson.

When you want to make this a habit, **[explore WHAT WORKS.](/shop/what-works)**.`,
  },
  {
    title: 'Digital vs Paper Planners: An Honest Comparison',
    slug: 'digital-vs-paper-planners-honest-comparison',
    excerpt: 'Should you go digital or stay with paper? An honest look at cost, flexibility, feel and sustainability, so you can choose what suits you.',
    cover_image: '/blog-content/digital-vs-paper.webp',
    category: 'Digital Tools',
    tags: ['digital planner', 'paper planner', 'comparison', 'ipad', 'planning'],
    meta_title: 'Digital vs Paper Planners: An Honest Comparison — Arwign Blog',
    meta_description: 'Should you go digital or stay with paper? An honest look at cost, flexibility, feel and sustainability, so you can choose what suits you.',
    read_time_mins: 7,
    status: 'published',
    published_at: '2026-09-25T12:00:00Z',
    body: `We make digital planners, so you might expect us to tell you paper is finished. We won't. Paper planners are lovely, and for some people they're the right choice.

But for a growing number of people, digital simply fits life better. Here is an honest comparison, so you can decide for yourself.

## The feel

**Paper:** There's something special about a new notebook: the smell, the texture, the satisfying weight of a full year in your hands. For many people, writing on paper feels slower and more deliberate, and that's valuable.

**Digital:** Writing on a tablet with a stylus feels closer to paper than most people expect, especially with a matte screen protector. You still write by hand, so you keep much of the reflective quality of pen and paper. You also get unlimited pen colours, a highlighter that never runs dry, and an undo button.

**Verdict:** Paper wins on pure sensory pleasure. Digital comes surprisingly close, with extras paper can't match.

## Flexibility

**Paper:** What's printed is what you get. Need more note pages in March? Too bad. Made a mistake? Correction tape and a sigh.

**Digital:** Duplicate a page, delete one, move it, add fifty more. Paste in photos, screenshots or receipts. Resize your handwriting. Change your mind as often as you like.

**Verdict:** Digital, comfortably.

## Finding things

**Paper:** Flicking through, sticky tabs, and a memory of "it was somewhere near the middle".

**Digital:** A hyperlinked planner lets you jump from your year to any day in a tap. Many apps can even search your handwriting.

**Verdict:** Digital, and it isn't close.

## Portability

**Paper:** One more thing to carry, and easy to leave behind.

**Digital:** It lives on a device you probably carry anyway, often with your notes, reading and work.

**Verdict:** Digital, especially if you already use a tablet daily.

## Cost over time

**Paper:** A good planner is a yearly purchase, and many people end up buying a second or third when their needs change.

**Digital:** You need a tablet and stylus, which is a real upfront cost if you don't already own them. But once you do, digital planners typically cost less than their printed equivalents, and many undated designs can be reused year after year.

**Verdict:** Paper is cheaper to start. Digital is often cheaper to continue, if you already have the device.

## Sustainability

**Paper:** Paper, printing, binding and shipping all have an environmental cost, repeated every year.

**Digital:** No paper, no printing and no shipping for the planner itself, though the device has its own footprint. If you already own one and use it for other things, adding a planner costs the planet very little.

**Verdict:** Digital has the edge for people who already own the device.

## Screen fatigue

**Paper:** A welcome break from screens.

**Digital:** One more reason to pick up a device, and possibly get distracted by notifications.

**Verdict:** Paper. If you choose digital, try Focus mode during planning time.

## So which should you choose?

**Choose paper** if you love the tactile ritual, want time away from screens, and don't own a tablet.

**Choose digital** if you already use a tablet, value flexibility, want to find things fast, or have abandoned paper planners because they couldn't keep up with your life.

## Why we chose digital

We design every Arwign planner to bring the warmth of paper to the flexibility of digital: soft parchment tones, considered typography, and layouts with room to breathe. Every page is hyperlinked, every planner comes in A4, A5 and US Letter, and each one is made to feel like something you *want* to open.

## Your next step

If you're curious but unsure, start small: try one focused planner for a month and see how it fits your days.

**[Browse the Arwign Planners collection](/shop)**, and find one made for the way you work.`,
  },
  {
    title: 'A5, A4 or US Letter? How to Choose the Right Planner Size for Your Tablet',
    slug: 'digital-planner-size-a5-a4-us-letter',
    excerpt: "A5, A4 or US Letter? Here's how each planner size looks and feels on a tablet, and how to pick the one that suits your device and handwriting.",
    cover_image: '/blog-content/planner-sizes.webp',
    category: 'Digital Tools',
    tags: ['planner size', 'a5', 'a4', 'us letter', 'ipad'],
    meta_title: 'Best Digital Planner Size for iPad: A5, A4 or US Letter — Arwign Blog',
    meta_description: "A5, A4 or US Letter? Here's how each planner size looks and feels on a tablet, and how to pick the one that suits your device and handwriting.",
    read_time_mins: 6,
    status: 'published',
    published_at: '2026-09-25T11:00:00Z',
    body: `You've found the planner you want. Then comes a question that seems small but makes a real difference to how it feels every day: **which size?**

With paper, size means how big the book is. With digital, it's more subtle, because your screen stays the same size. What changes is how the page fits that screen, and how much room each layout gives your handwriting.

Here's how to choose.

## First, a quick bit of background

- **A5** (148 × 210 mm): the classic notebook size, popular in the UK, Europe and much of the world.
- **A4** (210 × 297 mm): the standard document size outside North America.
- **US Letter** (8.5 × 11 in): the standard document size in the United States and Canada.

A5 and A4 share exactly the same proportions, as A5 is simply half of A4. US Letter is slightly shorter and wider.

## How each one looks on a tablet

When you open a planner in GoodNotes or Notability, the page scales to fit your screen. So an A5 page and an A4 page will look the same shape. The difference is in the **design** each size allows.

**A5 layouts** tend to be simpler and more focused, with fewer, larger writing spaces per page. On screen, that often means bigger boxes and less zooming. Great for quick, daily planning and for smaller tablets.

**A4 layouts** have room for more on each page: extra columns, notes sections, trackers side by side. Ideal if you like to see a whole week or month in rich detail, and if you're using a larger tablet.

**US Letter layouts** are similar in capacity to A4, but the wider, shorter shape sits closer to the proportions of many tablet screens held upright, so you may see a little less empty border around the page.

## Choose by your device

- **Smaller tablet (for example, an iPad mini):** A5 usually feels most comfortable. Bigger writing spaces mean less zooming on a smaller screen.
- **Standard or Air-sized tablet:** any size works well. Choose by how much detail you want on each page.
- **Large tablet (for example, a 12.9 or 13-inch iPad Pro):** A4 or US Letter makes the most of the extra space.

## Choose by how you write

- **Larger handwriting?** A5 gives you more generous spaces at normal zoom.
- **Small, neat handwriting?** A4 or US Letter lets you fit more onto each page.
- **Love to zoom in and write?** Any size works. Choose the layout you like best.

## Choose by whether you'll print

Some people like to print the occasional page, such as a monthly overview for the fridge. If you might, choose the paper size your printer uses: US Letter in North America, A4 almost everywhere else.

## The good news: you don't have to guess

Every Arwign planner comes in all three sizes, **A4, A5 and US Letter**, included with your purchase. Each size is laid out and hyperlinked individually, not just stretched, so every version works properly.

Open them all, try each one for a day or two, and keep the one that feels right in your hand.

## Your next step

Pick up your tablet and notice how you naturally write on it: big and loose, or small and neat? That's most of your answer.

Then **[find your planner in the Arwign collection](/shop)**. Whichever size suits you, it's already included.`,
  },
]

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
    .upsert(POSTS, { onConflict: 'slug' })
    .select('slug, status')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: data?.length ?? 0, slugs: (data ?? []).map((r) => r.slug) })
}
