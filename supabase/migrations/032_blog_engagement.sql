-- 032_blog_engagement.sql
-- Blog engagement: likes (anonymous), comments (login-required), and per-account
-- saved "Best Reads". Idempotent — safe to run more than once.

-- ── Denormalised counters on the post (cheap reads) ─────────────
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS like_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- ── Saved "Best Reads" per account (mirrors profiles.wishlist) ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_posts UUID[] NOT NULL DEFAULT '{}';

-- ── Comments — modelled on the reviews table ────────────────────
-- Login required to post (RLS below). author_name is snapshotted from the
-- profile at write time so the list renders without a join.
CREATE TABLE IF NOT EXISTS blog_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status      TEXT NOT NULL DEFAULT 'approved',  -- approved | hidden (admin can hide)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_comments_post_idx ON blog_comments (post_id, created_at DESC);

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible comments.
DROP POLICY IF EXISTS "blog_comments: public read" ON blog_comments;
CREATE POLICY "blog_comments: public read" ON blog_comments
  FOR SELECT USING (status = 'approved');

-- Logged-in users may post as themselves only.
DROP POLICY IF EXISTS "blog_comments: auth insert own" ON blog_comments;
CREATE POLICY "blog_comments: auth insert own" ON blog_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authors may delete their own comment.
DROP POLICY IF EXISTS "blog_comments: delete own" ON blog_comments;
CREATE POLICY "blog_comments: delete own" ON blog_comments
  FOR DELETE USING (auth.uid() = user_id);
