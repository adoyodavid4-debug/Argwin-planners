// Plain TypeScript module — no 'use client', importable from server and client alike.

export interface BlogPost {
  id:          string
  title:       string
  slug:        string
  excerpt:     string
  cover:       string
  category:    string
  tags:        string[]
  readMins:    number
  publishedAt: string
  viewCount:   number
  /** Markdown body — present for DB-managed posts, absent for static ones. */
  body?:       string | null
}

export const STATIC_POSTS: BlogPost[] = [
  {
    id: 'sp-1',
    title: 'How a Digital Planner Changed My Morning Routine Forever',
    slug: 'digital-planner-morning-routine',
    excerpt: `We all know the theory: start your morning with intention and the rest of the day follows. But knowing and doing are very different things. Here's how switching to a digital planner on my iPad turned chaotic mornings into calm, purposeful ones — and the exact template I use every single day.`,
    cover: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80',
    category: 'Lifestyle',
    tags: ['morning routine', 'digital planning', 'productivity'],
    readMins: 6,
    publishedAt: '2025-05-15T08:00:00Z',
    viewCount: 4821,
  },
  {
    id: 'sp-2',
    title: 'GoodNotes vs Notability: Which App Pairs Best With Your Planner?',
    slug: 'goodnotes-vs-notability-planner',
    excerpt: `Both apps are excellent. Both have passionate loyalists. And both work beautifully with Arwign planner templates — but in different ways. After testing every major feature side by side, here's our honest breakdown to help you pick the right app for how you actually plan.`,
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    category: 'Digital Tools',
    tags: ['GoodNotes', 'Notability', 'iPad', 'apps'],
    readMins: 8,
    publishedAt: '2025-05-02T09:00:00Z',
    viewCount: 7340,
  },
  {
    id: 'sp-3',
    title: 'The Science Behind the 66-Day Habit Loop (And How to Use It)',
    slug: 'science-66-day-habit-loop',
    excerpt: `You've probably heard that habits take 21 days to form. That number is a myth. Research from University College London puts the actual average at 66 days — and the range is 18 to 254 days depending on the person and habit. Here's what that means for how you use your habit tracker.`,
    cover: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
    category: 'Productivity',
    tags: ['habits', 'habit tracker', 'science', 'routine'],
    readMins: 7,
    publishedAt: '2025-04-20T10:00:00Z',
    viewCount: 5902,
  },
  {
    id: 'sp-4',
    title: 'Budget Planning 101: How to Use a Monthly Tracker to Save More',
    slug: 'budget-planning-monthly-tracker-guide',
    excerpt: `Most people who buy a budget planner use it for exactly two weeks. Not because they're lazy — because nobody showed them a simple system. This guide walks through the exact method we built our budget planner around, step by step, month by month.`,
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    category: 'Finance',
    tags: ['budget', 'savings', 'money', 'finance tracker'],
    readMins: 9,
    publishedAt: '2025-04-08T08:00:00Z',
    viewCount: 6455,
  },
  {
    id: 'sp-5',
    title: 'Why Undated Planners Are Actually the Smarter Choice',
    slug: 'why-undated-planners-are-better',
    excerpt: `Dated planners give you one chance per year. Miss a week in March and you're looking at a stack of wasted pages every time you open the cover. Undated planners meet you where you are — every month, every year, on your terms. Here's why we design every Arwign planner undated by default.`,
    cover: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80',
    category: 'Planning',
    tags: ['undated planner', 'planning tips', 'flexibility'],
    readMins: 5,
    publishedAt: '2025-03-25T09:00:00Z',
    viewCount: 3187,
  },
  {
    id: 'sp-6',
    title: 'The Student Planner Guide: Ace Your Academic Year From Day One',
    slug: 'student-planner-guide-academic-year',
    excerpt: `University schedules are chaotic. Deadlines, lectures, reading lists, part-time jobs, and a social life — all competing for the same 168 hours every week. This guide shows you how to use your academic planner to stay on top of it all without burning out.`,
    cover: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80',
    category: 'Student Life',
    tags: ['student', 'academic planner', 'university', 'study tips'],
    readMins: 10,
    publishedAt: '2025-03-10T08:00:00Z',
    viewCount: 8901,
  },
  {
    id: 'sp-7',
    title: "Self-Care Isn't Selfish: Building a Wellness Routine That Sticks",
    slug: 'self-care-wellness-routine-that-sticks',
    excerpt: `The problem with most wellness routines isn't motivation — it's design. They're either too rigid, too vague, or built around someone else's life. Here's how to design a personal wellness system using your planner that actually fits the life you have, not the one you wish you had.`,
    cover: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
    category: 'Wellness',
    tags: ['self-care', 'wellness', 'mental health', 'routine'],
    readMins: 6,
    publishedAt: '2025-02-18T08:00:00Z',
    viewCount: 4213,
  },
  {
    id: 'sp-8',
    title: '10 Digital Planning Tips Every iPad Beginner Should Know',
    slug: 'digital-planning-tips-ipad-beginners',
    excerpt: `Switching from paper to digital planning feels overwhelming at first. Which stylus? Which app? How do hyperlinks work? Does it feel as satisfying as pen on paper? We answer all of it — plus share 10 tips we wish we'd known in our first month of digital planning.`,
    cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
    category: 'Digital Tools',
    tags: ['iPad', 'digital planning', 'beginners', 'tips'],
    readMins: 7,
    publishedAt: '2025-02-03T09:00:00Z',
    viewCount: 9412,
  },
]
