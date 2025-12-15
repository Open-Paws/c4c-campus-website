-- Migration: Add decision_note column to applications table
-- Created: 2025-12-15
-- Purpose: Store admin notes when reviewing applications (approve/reject/waitlist)

-- ============================================================================
-- MIGRATION UP
-- ============================================================================

-- Add the decision_note column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS decision_note TEXT;

-- Add documentation comment
COMMENT ON COLUMN applications.decision_note IS 'Admin note added when reviewing application (approve/reject/waitlist)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name = 'decision_note';

-- Expected result: decision_note | text | YES | NULL

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- ALTER TABLE applications DROP COLUMN IF EXISTS decision_note;
