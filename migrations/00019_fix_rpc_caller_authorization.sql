-- Migration: Fix is_student_in_teacher_cohort RPC caller authorization
-- Date: 2026-02-04
-- Description: Adds caller authorization check to prevent any authenticated user
--              from probing student-teacher relationships

-- ============================================================================
-- Update the function to include caller authorization
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_student_in_teacher_cohort(student_id UUID, teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
BEGIN
  -- Get the caller's ID
  caller_id := auth.uid();

  -- If no authenticated user, deny
  IF caller_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get caller's role
  SELECT role INTO caller_role
  FROM applications
  WHERE user_id = caller_id;

  -- Authorization check: caller must be one of:
  -- 1. The teacher checking their own students (teacher_id matches caller)
  -- 2. The student checking their own enrollment (student_id matches caller)
  -- 3. An admin
  IF caller_id != teacher_id
     AND caller_id != student_id
     AND caller_role != 'admin' THEN
    RETURN FALSE;
  END IF;

  -- Perform the actual relationship check
  RETURN EXISTS (
    SELECT 1
    FROM cohort_enrollments ce
    JOIN cohorts c ON ce.cohort_id = c.id
    JOIN courses co ON c.course_id = co.id
    WHERE ce.user_id = student_id
      AND co.created_by = teacher_id
  );
END;
$$;

-- Note: Grants remain the same as they were in 00013
-- GRANT EXECUTE ON FUNCTION public.is_student_in_teacher_cohort TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.is_student_in_teacher_cohort TO service_role;
