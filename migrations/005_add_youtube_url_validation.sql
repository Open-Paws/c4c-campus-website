-- Migration: Add YouTube URL validation to lessons table
-- SECURITY FIX: Prevents injection of malicious URLs (javascript:, phishing links, etc.)
-- This migration adds a CHECK constraint to validate YouTube URLs

-- Drop existing constraint if it exists (for idempotency)
ALTER TABLE lessons
DROP CONSTRAINT IF EXISTS valid_youtube_url;

-- Add CHECK constraint to validate YouTube URLs
-- Only allows NULL or valid YouTube URLs (youtube.com/watch?v= or youtu.be/)
-- SECURITY: Anchored with $ to prevent malicious URL suffixes
ALTER TABLE lessons
ADD CONSTRAINT valid_youtube_url
CHECK (
    youtube_url IS NULL
    OR youtube_url ~* '^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]{11}$'
);

COMMENT ON CONSTRAINT valid_youtube_url ON lessons IS 'Validates YouTube URLs to prevent malicious URL injection';
