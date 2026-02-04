-- Migration: Add admin SELECT policy for legacy enrollments table
-- Date: 2026-02-04
-- Description: Allows admin users to query the legacy enrollments table

-- ============================================================================
-- Add admin SELECT policy for legacy enrollments
-- ============================================================================

-- Drop policy if it exists (idempotent)
DROP POLICY IF EXISTS "Admins can read all legacy enrollments" ON enrollments;

-- Create admin SELECT policy
CREATE POLICY "Admins can read all legacy enrollments"
ON enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.user_id = auth.uid()
    AND applications.role = 'admin'
  )
);

-- Verification
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'enrollments'
ORDER BY policyname;
