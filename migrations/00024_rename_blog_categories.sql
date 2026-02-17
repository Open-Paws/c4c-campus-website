-- Migration: 00024_rename_blog_categories.sql
-- Rename blog categories: Announcements → News, Student Stories → Community
-- Run AFTER 00022 + 00023

-- Drop CHECK constraint FIRST so updates don't violate it
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_check;

-- Update existing rows
UPDATE blog_posts SET category = 'News' WHERE category = 'Announcements';
UPDATE blog_posts SET category = 'Community' WHERE category = 'Student Stories';

-- Add new CHECK constraint
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_category_check
  CHECK (category IN ('News', 'Community', 'Technical', 'Impact'));

-- Verify
SELECT category, count(*) FROM blog_posts GROUP BY category ORDER BY category;
