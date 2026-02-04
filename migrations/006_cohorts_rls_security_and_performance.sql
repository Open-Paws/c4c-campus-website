-- Migration: Security & Performance improvements for cohorts RLS policies
-- SECURITY FIX: Restricts cohorts SELECT from public to authenticated users only
-- PERFORMANCE FIX: Adds composite index for faster RLS policy lookups

-- ============================================================================
-- SECURITY FIX: Update cohorts SELECT policy to require authentication
-- Previously: USING (true) - allowed public access to all cohorts
-- Now: USING (auth.role() = 'authenticated') - requires authentication
-- ============================================================================

-- Drop the public SELECT policy and any existing authenticated policy
DROP POLICY IF EXISTS "cohorts_select_all" ON cohorts;
DROP POLICY IF EXISTS "cohorts_select_authenticated" ON cohorts;

-- Create new authenticated-only SELECT policy
-- PERFORMANCE: Using TO clause instead of USING (auth.role() = 'authenticated')
-- This skips policy evaluation entirely for anonymous users
CREATE POLICY "cohorts_select_authenticated" ON cohorts
    FOR SELECT
    TO authenticated
    USING (true);

COMMENT ON POLICY "cohorts_select_authenticated" ON cohorts IS 
    'Restricts cohort viewing to authenticated users only (security fix for preventing training schedule exposure)';

-- ============================================================================
-- PERFORMANCE: Add composite index for RLS policy lookups
-- This significantly improves performance of the RLS checks that query:
-- SELECT 1 FROM applications WHERE user_id = auth.uid() AND role IN (...)
-- ============================================================================

-- Note: Using regular CREATE INDEX (not CONCURRENTLY) to allow execution inside transaction
CREATE INDEX IF NOT EXISTS idx_applications_user_id_role 
    ON applications(user_id, role);

COMMENT ON INDEX idx_applications_user_id_role IS 
    'Composite index to optimize RLS policy lookups for cohorts INSERT/UPDATE/DELETE operations';
