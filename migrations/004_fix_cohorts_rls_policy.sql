-- Migration: Fix RLS policy infinite recursion on cohorts table
-- This fixes the "infinite recursion detected in policy for relation 'cohorts'" error
-- The issue is typically caused by a policy that references itself or creates a circular dependency

-- First, drop all existing policies on cohorts to start fresh
DROP POLICY IF EXISTS "Cohorts are viewable by everyone" ON cohorts;
DROP POLICY IF EXISTS "Cohorts can be inserted by teachers and admins" ON cohorts;
DROP POLICY IF EXISTS "Cohorts can be updated by teachers and admins" ON cohorts;
DROP POLICY IF EXISTS "Cohorts can be deleted by teachers and admins" ON cohorts;
DROP POLICY IF EXISTS "cohorts_select_policy" ON cohorts;
DROP POLICY IF EXISTS "cohorts_insert_policy" ON cohorts;
DROP POLICY IF EXISTS "cohorts_update_policy" ON cohorts;
DROP POLICY IF EXISTS "cohorts_delete_policy" ON cohorts;
-- Also drop the new policies in case this migration is re-run
DROP POLICY IF EXISTS "cohorts_select_all" ON cohorts;
DROP POLICY IF EXISTS "cohorts_insert_teachers_admins" ON cohorts;
DROP POLICY IF EXISTS "cohorts_update_creator_admin" ON cohorts;
DROP POLICY IF EXISTS "cohorts_delete_creator_admin" ON cohorts;

-- Enable RLS on cohorts table if not already enabled
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- SELECT: Everyone can view cohorts
CREATE POLICY "cohorts_select_all" ON cohorts
    FOR SELECT
    USING (true);

-- INSERT: Only teachers and admins can create cohorts
-- Uses a direct check against applications table without subqueries that could cause recursion
CREATE POLICY "cohorts_insert_teachers_admins" ON cohorts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications
            WHERE applications.user_id = auth.uid()
            AND applications.role IN ('teacher', 'admin')
        )
    );

-- UPDATE: Only the creator or admins can update cohorts
CREATE POLICY "cohorts_update_creator_admin" ON cohorts
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM applications
            WHERE applications.user_id = auth.uid()
            AND applications.role = 'admin'
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM applications
            WHERE applications.user_id = auth.uid()
            AND applications.role = 'admin'
        )
    );

-- DELETE: Only the creator or admins can delete cohorts
CREATE POLICY "cohorts_delete_creator_admin" ON cohorts
    FOR DELETE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM applications
            WHERE applications.user_id = auth.uid()
            AND applications.role = 'admin'
        )
    );

-- Note: If this migration doesn't fix the issue, the problem may be in related tables
-- (cohort_enrollments, cohort_schedule, etc.) that have policies referencing cohorts.
