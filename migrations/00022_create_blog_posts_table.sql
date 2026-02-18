-- Migration: Create blog_posts table
-- Date: 2026-02-17
-- Description: Adds blog_posts table for admin-managed blog content

-- ============================================================================
-- Create blog_posts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  category TEXT NOT NULL CHECK (category IN ('Announcements', 'Student Stories', 'Technical', 'Impact')),
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- Updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts (no auth required)
CREATE POLICY "Public view published blog posts" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Admins have full CRUD
CREATE POLICY "Admins manage all blog posts" ON blog_posts
  FOR ALL USING (is_admin((select auth.uid())));

-- ============================================================================
-- Verification
-- ============================================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;

SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'blog_posts'
ORDER BY policyname;
