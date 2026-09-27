-- ============================================================
--  Fill gaps on the 11 imported life-admin posts: cover image,
--  SEO meta and read time. COALESCE/NULLIF = only empty fields
--  are filled; anything your import already set is untouched.
--  Safe to re-run. Run whole file in the Supabase SQL editor.
-- ============================================================

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$How to Stop Checking Work Messages at Night$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Why after-hours work messages wreck your evening, why predictability beats availability, and a five-minute shutdown routine that lets your brain actually close the day.$q$),
  read_time_mins   = COALESCE(read_time_mins, 8),
  updated_at       = NOW()
WHERE slug = 'after-hours-work-messages-boundaries';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$How to Work on Big Goals With Very Little Time$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$The vision-to-Tuesday ladder, the forty-minute test, why big goals die of vagueness rather than busyness, and measuring output instead of hours.$q$),
  read_time_mins   = COALESCE(read_time_mins, 9),
  updated_at       = NOW()
WHERE slug = 'big-goals-small-time-side-projects';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$Caring for Ageing Parents While Working Full Time$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Practical systems for the sandwich generation: the emergency care page, naming a backup, telling your employer, planning around unpredictability, and the guilt nobody admits to.$q$),
  read_time_mins   = COALESCE(read_time_mins, 9),
  updated_at       = NOW()
WHERE slug = 'caring-for-parents-while-working';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$Why It Feels Like Everyone Is Ahead of You (And What to Do)$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Why the comparison is structurally rigged, where the life timeline you're measuring yourself against came from, and how to write your own definition of a good year.$q$),
  read_time_mins   = COALESCE(read_time_mins, 8),
  updated_at       = NOW()
WHERE slug = 'comparison-milestone-anxiety';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$Coping With Family Pressure During Exams$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Separating the goals you chose from the ones you inherited, how to have the conversation with family, managing the watching, and where to get support when it's too heavy.$q$),
  read_time_mins   = COALESCE(read_time_mins, 9),
  updated_at       = NOW()
WHERE slug = 'family-expectations-exam-pressure';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$The Mental Load: Why Remembering Everything Is Exhausting$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$The four phases of household cognitive labour, why 'just ask me and I'll do it' makes the mental load worse, and how to hand over whole domains instead of tasks.$q$),
  read_time_mins   = COALESCE(read_time_mins, 9),
  updated_at       = NOW()
WHERE slug = 'mental-load-household-cognitive-labour';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$How to Stop Overcommitting (and Actually Say No)$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Why you say yes when you mean no, the 24-hour holding line, four ways to decline that actually work, and how to audit the commitments you already carry.$q$),
  read_time_mins   = COALESCE(read_time_mins, 8),
  updated_at       = NOW()
WHERE slug = 'overcommitment-how-to-say-no';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$Your Partner's Alarm Is Ruining Your Sleep — Here's the Fix$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Why they genuinely don't hear it, what the snooze research actually found, the fixes in order of effort, mismatched sleep schedules, and why a third of couples sleep apart.$q$),
  read_time_mins   = COALESCE(read_time_mins, 8),
  updated_at       = NOW()
WHERE slug = 'partners-alarm-ruining-your-sleep';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$How to Recover After a Terrible Week at Work$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$A triage system for a week that fell apart: sorting the wreckage, the three-line repair message, why you should underplan the recovery, and when to run the post-mortem.$q$),
  read_time_mins   = COALESCE(read_time_mins, 8),
  updated_at       = NOW()
WHERE slug = 'recovering-from-a-bad-week-at-work';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$How to Handle School Admin Without Losing Your Mind$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$School admin sorted into four categories, a one-hour term map, a protocol for the class group chat, and permission to skip the bake sale.$q$),
  read_time_mins   = COALESCE(read_time_mins, 8),
  updated_at       = NOW()
WHERE slug = 'school-admin-term-planning-for-parents';

UPDATE blog_posts SET
  cover_image      = COALESCE(NULLIF(cover_image, ''), 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80'),
  og_image         = COALESCE(NULLIF(og_image, ''), 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80'),
  meta_title       = COALESCE(NULLIF(meta_title, ''), $q$Why Revision Timetables Fail (And How to Build One That Works)$q$),
  meta_description = COALESCE(NULLIF(meta_description, ''), $q$Plan outcomes instead of hours, what the evidence actually says about highlighting and rereading, building a timetable backwards from the papers, and the gap list.$q$),
  read_time_mins   = COALESCE(read_time_mins, 9),
  updated_at       = NOW()
WHERE slug = 'why-revision-timetables-fail';
