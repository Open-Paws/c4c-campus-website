-- ============================================================================
-- C4C Campus Database Schema
-- AI Development Accelerator for Animal Liberation
-- ============================================================================
-- Run this schema in Supabase SQL Editor
-- Generated: November 2025
-- ============================================================================

-- ============================================================================
-- ⚠️  DESTRUCTIVE OPERATIONS - READ CAREFULLY ⚠️
-- ============================================================================
-- This schema file contains DROP TABLE statements that will DELETE ALL DATA.
--
-- USE CASES:
--   ✓ Fresh database setup (development/testing)
--   ✓ Resetting local development environment
--   ✗ Production databases (use migration scripts instead)
--
-- BEFORE RUNNING:
--   1. Backup your database: pg_dump or Supabase dashboard backup
--   2. Verify you're not connected to production
--   3. Understand that ALL DATA will be permanently deleted
--
-- ALTERNATIVES:
--   - For production: Use migration scripts in migrations/ directory
--   - For adding columns: See migrations/add_cohort_id_columns.sql
--   - For Supabase: Use Supabase CLI migrations (supabase db push)
-- ============================================================================

-- ============================================================================
-- TABLE DEPENDENCY HIERARCHY:
-- ============================================================================
--
--   auth.users (Supabase managed)
--   ├── applications
--   ├── profiles
--   ├── auth_logs
--   └── courses
--       ├── modules
--       │   └── lessons
--       │       ├── lesson_discussions (→ cohorts)
--       │       ├── lesson_progress (→ cohorts)
--       │       ├── quizzes
--       │       │   ├── quiz_questions
--       │       │   └── quiz_attempts (→ cohorts)
--       │       └── assignments
--       │           ├── assignment_rubrics
--       │           └── assignment_submissions
--       ├── cohorts
--       │   ├── cohort_enrollments
--       │   ├── cohort_schedules
--       │   └── enrollments (→ courses)
--       ├── course_forums (→ cohorts)
--       │   └── forum_replies
--       ├── ai_conversations
--       │   └── ai_messages
--       ├── certificates (→ certificate_templates)
--       └── payments
--   blog_posts (standalone, FK to auth.users)
--
-- ============================================================================

-- ============================================================================
-- DROP TABLE STATEMENTS (Reverse dependency order)
-- ============================================================================
-- Drop order: children → parents to respect foreign key constraints
-- CASCADE ensures dependent objects are also dropped

-- Level 7 - Deepest dependencies (drop first)
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- Level 6 - Second-level children
DROP TABLE IF EXISTS lesson_discussions CASCADE;
DROP TABLE IF EXISTS course_forums CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS assignment_rubrics CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_usage_logs CASCADE;

-- Level 5 - First-level children
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS media_library CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;

-- Level 4 - Module/cohort dependencies
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS cohort_enrollments CASCADE;
DROP TABLE IF EXISTS cohort_schedules CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS message_threads CASCADE;

-- Level 3 - Parent tables
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS cohorts CASCADE;
DROP TABLE IF EXISTS certificate_templates CASCADE;

-- Level 2 - Root tables
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS auth_logs CASCADE;

-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq START 1;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.applications
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.applications
    WHERE user_id = user_uuid AND role IN ('teacher', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to check if current user is admin (no parameter version)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if current user is teacher (no parameter version)
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.applications
  WHERE user_id = check_user_id;
  RETURN COALESCE(user_role, 'student');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to check if course is completed
CREATE OR REPLACE FUNCTION public.is_course_completed(check_user_id UUID, check_course_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.enrollments
    WHERE user_id = check_user_id
    AND course_id = check_course_id
    AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to get course completion date
CREATE OR REPLACE FUNCTION public.get_course_completion_date(check_user_id UUID, check_course_id BIGINT)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT completed_at::text FROM public.enrollments
    WHERE user_id = check_user_id
    AND course_id = check_course_id);
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.certificate_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to approve application
CREATE OR REPLACE FUNCTION public.approve_application(application_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.applications
  SET
    status = 'approved',
    reviewed_at = NOW()
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to reject application
CREATE OR REPLACE FUNCTION public.reject_application(application_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.applications
  SET
    status = 'rejected',
    reviewed_at = NOW()
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to waitlist application
CREATE OR REPLACE FUNCTION public.waitlist_application(application_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.applications
  SET
    status = 'waitlisted',
    reviewed_at = NOW()
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to check if user can submit to an assignment
-- Returns TRUE if submission is allowed, FALSE otherwise
--
-- This is a pure check function (returns boolean, not exceptions).
-- API handlers should use this to gate submissions, then provide user-friendly
-- error messages based on which rule failed.
--
-- Rules checked (in order):
--   1. Assignment must exist and be published
--   2. If past due_date and allow_late_submissions=false, deny
--   3. First submission is always allowed (if above pass)
--   4. Resubmission requires allow_resubmission=true
--   5. Cannot exceed max_submissions limit
--
CREATE OR REPLACE FUNCTION public.can_user_submit(
  assignment_id_param UUID,
  user_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment RECORD;
  v_submission_count INTEGER;
BEGIN
  -- Get assignment details
  SELECT
    is_published,
    due_date,
    allow_late_submissions,
    allow_resubmission,
    max_submissions
  INTO v_assignment
  FROM public.assignments
  WHERE id = assignment_id_param;

  -- Assignment must exist and be published
  IF NOT FOUND OR NOT v_assignment.is_published THEN
    RETURN FALSE;
  END IF;

  -- Check due date if not allowing late submissions
  IF v_assignment.due_date IS NOT NULL
     AND v_assignment.due_date < NOW()
     AND NOT v_assignment.allow_late_submissions THEN
    RETURN FALSE;
  END IF;

  -- Count existing submissions
  SELECT COUNT(*) INTO v_submission_count
  FROM public.assignment_submissions
  WHERE assignment_id = assignment_id_param
    AND user_id = user_id_param;

  -- If no submissions yet, allow
  IF v_submission_count = 0 THEN
    RETURN TRUE;
  END IF;

  -- If resubmission not allowed, deny
  IF NOT COALESCE(v_assignment.allow_resubmission, FALSE) THEN
    RETURN FALSE;
  END IF;

  -- Check max submissions limit
  IF v_assignment.max_submissions IS NOT NULL
     AND v_submission_count >= v_assignment.max_submissions THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get assignment statistics
-- Returns aggregate statistics for all submissions to an assignment
--
-- This function returns a single row with submission statistics.
-- If the assignment has no submissions, all counts will be 0 and average_score will be NULL.
--
-- Return columns:
--   total_submissions   - Total number of submissions
--   graded_submissions  - Submissions with status='graded'
--   average_score       - Mean score across graded submissions (NULL if none graded)
--   late_submissions    - Submissions with is_late=true
--   on_time_submissions - Submissions with is_late=false or NULL
--
CREATE OR REPLACE FUNCTION public.get_assignment_stats(assignment_id_param UUID)
RETURNS TABLE(
  total_submissions BIGINT,
  graded_submissions BIGINT,
  average_score NUMERIC,
  late_submissions BIGINT,
  on_time_submissions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_submissions,
    COUNT(*) FILTER (WHERE status = 'graded')::BIGINT as graded_submissions,
    ROUND(AVG(score)::NUMERIC, 2) as average_score,
    COUNT(*) FILTER (WHERE is_late = TRUE)::BIGINT as late_submissions,
    COUNT(*) FILTER (WHERE is_late = FALSE OR is_late IS NULL)::BIGINT as on_time_submissions
  FROM public.assignment_submissions
  WHERE assignment_id = assignment_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger function to log application approval
CREATE OR REPLACE FUNCTION public.log_application_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    RAISE NOTICE 'Application approved for user %. Email: %.', NEW.name, NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger function to update cohort status based on dates
CREATE OR REPLACE FUNCTION public.update_cohort_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date <= CURRENT_DATE AND (NEW.end_date IS NULL OR NEW.end_date >= CURRENT_DATE) THEN
    NEW.status = 'active';
  ELSIF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE THEN
    NEW.status = 'completed';
  ELSIF NEW.start_date > CURRENT_DATE THEN
    NEW.status = 'upcoming';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Trigger function to update last activity timestamp
CREATE OR REPLACE FUNCTION public.update_last_activity_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Trigger function to increment completed lessons count
CREATE OR REPLACE FUNCTION public.increment_completed_lessons()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = TRUE AND OLD.completed = FALSE AND NEW.cohort_id IS NOT NULL THEN
    UPDATE public.cohort_enrollments
    SET completed_lessons = completed_lessons + 1,
        last_activity_at = NOW()
    WHERE cohort_id = NEW.cohort_id
      AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to refresh student roster materialized view
-- Call this after bulk updates to cohort_enrollments, lesson_discussions, or course_forums
-- Uses CONCURRENTLY to avoid locking the view during refresh (requires unique index)
CREATE OR REPLACE FUNCTION public.refresh_student_roster_view()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY student_roster_view;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to non-concurrent refresh if concurrent fails
    -- (e.g., if unique index doesn't exist yet)
    REFRESH MATERIALIZED VIEW student_roster_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

-- Applications table (user profiles with roles)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  program TEXT NOT NULL CHECK (program IN ('bootcamp', 'accelerator', 'hackathon')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  location TEXT,
  discord TEXT,
  interests TEXT[],
  motivation TEXT,
  technical_experience TEXT,
  commitment TEXT,
  -- Diversity and career fields (both programs)
  protected_class TEXT,
  career_goals TEXT,
  -- Scholarship fields (bootcamp only)
  scholarship_requested BOOLEAN DEFAULT FALSE,
  scholarship_category TEXT CHECK (scholarship_category IS NULL OR scholarship_category IN ('SC', 'OBC', 'EWS', 'DNT', 'Transgender')),
  -- Accelerator-specific fields
  track TEXT,
  project_name TEXT,
  project_description TEXT,
  prototype_link TEXT,
  tech_stack TEXT,
  target_users TEXT,
  production_needs TEXT,
  team_size INTEGER,
  current_stage TEXT CHECK (current_stage IS NULL OR current_stage IN ('Prototype/MVP', 'Beta with users', 'Live in production')),
  funding TEXT CHECK (funding IS NULL OR funding IN ('For-profit', 'Non-profit', 'Not sure yet')),
  -- Review fields
  assigned_reviewer_id UUID REFERENCES auth.users(id),
  assignment_date TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_program ON applications(program);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_role ON applications(role);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_reviewer ON applications(assigned_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_scholarship ON applications(scholarship_requested) WHERE scholarship_requested = TRUE;

-- Profiles table (extended user info)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth logs table (security audit)
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);

-- ============================================================================
-- COURSE STRUCTURE
-- ============================================================================

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  track TEXT CHECK (track IN ('animal_advocacy', 'climate', 'ai_safety', 'general')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_published BOOLEAN DEFAULT FALSE,
  is_cohort_based BOOLEAN DEFAULT TRUE,
  default_duration_weeks INTEGER DEFAULT 8,
  enrollment_type TEXT DEFAULT 'open' CHECK (enrollment_type IN ('open', 'cohort_only', 'hybrid')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_courses_track ON courses(track);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, order_index);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id BIGSERIAL PRIMARY KEY,
  module_id BIGINT REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  youtube_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  resources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_slug ON lessons(slug);

-- ============================================================================
-- COHORT SYSTEM
-- ============================================================================
-- NOTE: Cohorts must be defined before lesson_progress due to FK dependency
--
-- TABLES WITH cohort_id FOREIGN KEY:
--   - cohort_enrollments (CASCADE delete)
--   - cohort_schedules (CASCADE delete)
--   - lesson_progress (SET NULL on delete)
--   - enrollments (SET NULL on delete)
--   - lesson_discussions (CASCADE delete)
--   - course_forums (CASCADE delete)
--   - quiz_attempts (SET NULL on delete)
--
-- DELETE BEHAVIOR:
--   - CASCADE: Child records deleted when cohort is deleted
--   - SET NULL: cohort_id set to NULL, record preserved
--
-- DATA INTEGRITY RATIONALE:
--   CASCADE is used for cohort-scoped data where records lose meaning without
--   the cohort context (enrollments, schedules, discussions, forums).
--   SET NULL is used for historical records where student work should be
--   preserved even if the cohort is deleted (lesson_progress, quiz_attempts).
--
-- QUERY PERFORMANCE:
--   All cohort_id columns have B-tree indexes (idx_*_cohort) for efficient
--   filtering by cohort. Enables fast WHERE cohort_id = ? queries for
--   teacher dashboards, progress reports, and roster views.
--
-- MIGRATION NOTES:
--   For existing databases, use migrations/add_cohort_id_columns.sql to add
--   cohort_id columns to tables that may lack them. For fresh installs, this
--   schema.sql file includes all cohort_id columns by default.
--
-- COHORT FOREIGN KEY DEPENDENCY TREE:
--
--   cohorts (id: UUID)
--   ├── cohort_enrollments (CASCADE) ─── tracks student membership
--   ├── cohort_schedules (CASCADE) ───── defines module unlock dates
--   ├── lesson_progress (SET NULL) ───── preserves completion history
--   ├── enrollments (SET NULL) ────────── legacy course enrollment
--   ├── lesson_discussions (CASCADE) ─── cohort-scoped Q&A threads
--   ├── course_forums (CASCADE) ──────── cohort-scoped forum posts
--   └── quiz_attempts (SET NULL) ──────── preserves quiz history
--
-- COHORT_ID INDEXES (Performance Optimization):
--   - idx_cohort_enrollments_cohort (cohort_enrollments table)
--   - idx_cohort_schedules_cohort (cohort_schedules table)
--   - idx_progress_cohort (lesson_progress table)
--   - idx_enrollments_cohort (enrollments table)
--   - idx_lesson_discussions_cohort (lesson_discussions table)
--   - idx_course_forums_cohort (course_forums table)
--   - idx_quiz_attempts_cohort (quiz_attempts table)
--
-- ============================================================================

-- Cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  max_students INTEGER DEFAULT 50 CHECK (max_students > 0),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_cohorts_course ON cohorts(course_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts(status);
CREATE INDEX IF NOT EXISTS idx_cohorts_start_date ON cohorts(start_date DESC);

-- Cohort enrollments table
-- Primary enrollment tracking table for cohort-based learning
-- cohort_id: CASCADE delete - enrollment meaningless without cohort
-- Tracks student progress, status, and activity within specific cohort
CREATE TABLE IF NOT EXISTS cohort_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'paused')),
  completed_lessons INTEGER DEFAULT 0,
  progress JSONB DEFAULT '{"completed_lessons": 0, "completed_modules": 0, "percentage": 0}',
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_enrollments_cohort ON cohort_enrollments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_enrollments_user ON cohort_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_enrollments_status ON cohort_enrollments(status);

-- Cohort schedules table (time-gating)
-- Time-gating configuration per cohort (module unlock/lock dates)
-- cohort_id: CASCADE delete - schedule only relevant to specific cohort
-- Enables cohort-specific pacing and content release schedules
CREATE TABLE IF NOT EXISTS cohort_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE CASCADE,
  unlock_date DATE NOT NULL,
  lock_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_id, module_id),
  CHECK (lock_date IS NULL OR lock_date > unlock_date)
);

CREATE INDEX IF NOT EXISTS idx_cohort_schedules_cohort ON cohort_schedules(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_schedules_unlock ON cohort_schedules(unlock_date);

-- Lesson progress table (depends on cohorts)
-- Individual lesson completion tracking across all courses
-- cohort_id: SET NULL on delete - preserves student progress history
-- Nullable to support both cohort-based and self-paced enrollment
-- Used for analytics, certificates, and progress dashboards
CREATE TABLE IF NOT EXISTS lesson_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ, -- Timestamp when lesson was marked complete
  video_position_seconds INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  watch_count INTEGER DEFAULT 1, -- Number of times lesson was watched/revisited
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_cohort ON lesson_progress(cohort_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON lesson_progress(completed);

-- Enrollments table (legacy/hybrid)
-- Legacy/hybrid enrollment table (course-level tracking)
-- cohort_id: SET NULL on delete - preserves enrollment record
-- Coexists with cohort_enrollments for backward compatibility
-- Gradually being replaced by cohort_enrollments for cohort-based courses
CREATE TABLE IF NOT EXISTS enrollments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'paused')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort ON enrollments(cohort_id);

-- ============================================================================
-- DISCUSSIONS & FORUMS
-- ============================================================================

-- Lesson discussions table
-- Lesson-specific discussion threads (Q&A, peer interaction)
-- cohort_id: CASCADE delete - discussions scoped to cohort context
-- Enables cohort-isolated conversations (students only see their cohort)
-- Supports threaded replies via parent_id self-reference
-- NOTE: This table may be missing from src/types/generated.ts
-- Run `npm run db:types` after schema deployment to regenerate types
CREATE TABLE IF NOT EXISTS lesson_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES lesson_discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  is_teacher_response BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson ON lesson_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_cohort ON lesson_discussions(cohort_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_user ON lesson_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_parent ON lesson_discussions(parent_id);

-- Course forums table
-- Course-wide forum posts (announcements, general discussion)
-- cohort_id: CASCADE delete - forum posts scoped to cohort
-- Broader than lesson_discussions, covers course-level topics
-- Teachers can pin/lock posts for cohort-wide visibility
-- NOTE: This table may be missing from src/types/generated.ts
-- Run `npm run db:types` after schema deployment to regenerate types
CREATE TABLE IF NOT EXISTS course_forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_forums_course ON course_forums(course_id);
CREATE INDEX IF NOT EXISTS idx_course_forums_cohort ON course_forums(cohort_id);

-- Forum replies table
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_post_id UUID REFERENCES course_forums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  is_teacher_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(forum_post_id);

-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================
--
-- student_roster_view
-- -------------------
-- Purpose: Pre-aggregated student roster with progress and engagement metrics
--
-- Columns:
--   - cohort_id: UUID reference to cohorts
--   - user_id: UUID reference to auth.users
--   - name: Student name (from applications or profiles)
--   - email: Student email (from applications or profiles)
--   - enrolled_at: Enrollment timestamp
--   - status: Enrollment status (active/completed/dropped/paused)
--   - last_activity_at: Last activity timestamp
--   - completed_lessons: Count of completed lessons
--   - discussion_posts: Count of lesson discussion posts
--   - forum_posts: Count of course forum posts
--
-- Usage:
--   SELECT * FROM student_roster_view WHERE cohort_id = ?;
--
-- Refresh:
--   SELECT refresh_student_roster_view();
--
-- Performance:
--   - Indexed on cohort_id, user_id, status, last_activity_at
--   - Refresh time: <2 seconds for typical cohort sizes (<500 students)
--   - Query time: <200ms for filtered queries
--
-- Dependencies:
--   - cohort_enrollments (base table)
--   - applications (student identity)
--   - profiles (fallback identity)
--   - lesson_discussions (aggregated counts)
--   - course_forums (aggregated counts)
--
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS student_roster_view AS
SELECT
  ce.cohort_id,
  ce.user_id,
  COALESCE(a.name, p.full_name, p.email) AS name,
  COALESCE(a.email, p.email) AS email,
  ce.enrolled_at,
  ce.status,
  ce.last_activity_at,
  ce.completed_lessons,
  COALESCE(ld.discussion_posts, 0) AS discussion_posts,
  COALESCE(cf.forum_posts, 0) AS forum_posts
FROM cohort_enrollments ce
LEFT JOIN applications a ON ce.user_id = a.user_id
LEFT JOIN profiles p ON ce.user_id = p.id
LEFT JOIN (
  SELECT
    user_id,
    cohort_id,
    COUNT(*) AS discussion_posts
  FROM lesson_discussions
  GROUP BY user_id, cohort_id
) ld ON ce.user_id = ld.user_id AND ce.cohort_id = ld.cohort_id
LEFT JOIN (
  SELECT
    user_id,
    cohort_id,
    COUNT(*) AS forum_posts
  FROM course_forums
  GROUP BY user_id, cohort_id
) cf ON ce.user_id = cf.user_id AND ce.cohort_id = cf.cohort_id;

-- Indexes for student_roster_view (materialized view)
CREATE INDEX IF NOT EXISTS idx_student_roster_cohort
  ON student_roster_view(cohort_id);

CREATE INDEX IF NOT EXISTS idx_student_roster_user
  ON student_roster_view(user_id);

CREATE INDEX IF NOT EXISTS idx_student_roster_status
  ON student_roster_view(status);

CREATE INDEX IF NOT EXISTS idx_student_roster_last_activity
  ON student_roster_view(last_activity_at DESC);

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
-- Ensures each student appears only once per cohort
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_roster_unique_cohort_user
  ON student_roster_view(cohort_id, user_id);

-- ============================================================================
-- ASSESSMENTS - QUIZZES
-- ============================================================================

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  max_attempts INTEGER DEFAULT 3,
  randomize_questions BOOLEAN DEFAULT FALSE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  show_results_immediately BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published);

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'multiple_select')),
  question_text TEXT NOT NULL,
  points INTEGER DEFAULT 1 CHECK (points > 0),
  order_index INTEGER NOT NULL,
  options JSONB,
  correct_answer TEXT,
  answer_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_index);

-- Quiz attempts table
-- Student quiz submission records with grading
-- cohort_id: SET NULL on delete - preserves attempt history for analytics
-- Nullable to support both cohort-based and self-paced quizzes
-- Tracks attempt_number for max_attempts enforcement
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INTEGER,
  score DECIMAL(5,2) CHECK (score BETWEEN 0 AND 100),
  total_points INTEGER,
  points_earned INTEGER,
  passed BOOLEAN,
  answers_json JSONB DEFAULT '[]',
  grading_status TEXT DEFAULT 'pending' CHECK (grading_status IN ('pending', 'auto_graded', 'needs_review')),
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  UNIQUE(quiz_id, user_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_cohort ON quiz_attempts(cohort_id);

-- ============================================================================
-- ASSESSMENTS - ASSIGNMENTS
-- ============================================================================

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  max_points INTEGER DEFAULT 100 CHECK (max_points > 0),
  due_date TIMESTAMPTZ,
  allow_late_submissions BOOLEAN DEFAULT TRUE,
  late_penalty_percent INTEGER DEFAULT 0 CHECK (late_penalty_percent BETWEEN 0 AND 100),
  allow_resubmission BOOLEAN DEFAULT FALSE,
  max_submissions INTEGER DEFAULT 1 CHECK (max_submissions > 0),
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT[] DEFAULT ARRAY['pdf','docx','txt','zip'],
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_module ON assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Assignment rubrics table
CREATE TABLE IF NOT EXISTS assignment_rubrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  criterion TEXT NOT NULL,
  description TEXT,
  max_points INTEGER NOT NULL CHECK (max_points > 0),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assignment ON assignment_rubrics(assignment_id, order_index);

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_number INTEGER DEFAULT 1 CHECK (submission_number > 0),
  submission_text TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  file_type TEXT,
  file_urls TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
  score DECIMAL(5,2) CHECK (score >= 0),
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  rubric_scores JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, user_id, submission_number)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status);

-- ============================================================================
-- MESSAGING & NOTIFICATIONS
-- ============================================================================

-- Message threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0),
  attachments TEXT[],
  read_by UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('platform', 'course', 'cohort')),
  target_id UUID,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published BOOLEAN DEFAULT FALSE,
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope, target_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published, publish_at DESC);

-- ============================================================================
-- AI TEACHING ASSISTANT
-- ============================================================================

-- AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT,
  model TEXT DEFAULT 'claude-3.5-sonnet',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_course ON ai_conversations(course_id);

-- AI messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- AI usage logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost DECIMAL(10,6) NOT NULL,
  operation TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model);

-- ============================================================================
-- CERTIFICATES
-- ============================================================================

-- Certificate templates table
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  template_html TEXT NOT NULL,
  template_variables TEXT[],
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  template_id UUID REFERENCES certificate_templates(id),
  certificate_code TEXT UNIQUE NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  completion_date DATE,
  final_grade TEXT,
  pdf_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id, issued_date DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_payment_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_type TEXT CHECK (payment_type IN ('one_time', 'subscription', 'course_fee')),
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro_monthly', 'pro_yearly', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- MEDIA LIBRARY
-- ============================================================================

-- Media library table
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_path TEXT UNIQUE NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  folder TEXT DEFAULT '/',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alt_text TEXT,
  caption TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  is_in_use BOOLEAN DEFAULT FALSE,
  malware_scan_status TEXT DEFAULT 'pending' CHECK (malware_scan_status IN ('pending', 'clean', 'infected', 'failed')),
  malware_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_library_path ON media_library(file_path);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_by ON media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON media_library USING GIN(tags);

-- ============================================================================
-- BLOG
-- ============================================================================

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  category TEXT NOT NULL CHECK (category IN ('News', 'Community', 'Technical', 'Impact')),
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- ============================================================================
-- TABLE-DEPENDENT FUNCTIONS
-- ============================================================================
-- These functions return table row types and must be defined after tables exist.
-- They are placed here (after all CREATE TABLE statements) to avoid
-- "type does not exist" errors during fresh schema deployment.
-- ============================================================================

-- Function to enroll user in cohort with atomic capacity check
-- Returns the enrollment record on success, or raises an exception on failure
--
-- Error Codes (for API error handling):
--   P0002 / COHORT_NOT_FOUND     - Cohort does not exist
--   P0003 / COHORT_NOT_OPEN      - Cohort is not accepting enrollments (status not upcoming/active)
--   P0004 / COHORT_FULL          - Cohort has reached max_students capacity
--   23505 / ALREADY_ENROLLED     - User is already enrolled in this cohort
--
CREATE OR REPLACE FUNCTION public.enroll_in_cohort(
  p_cohort_id UUID,
  p_user_id UUID
)
RETURNS public.cohort_enrollments AS $$
DECLARE
  v_cohort public.cohorts;
  v_current_count INTEGER;
  v_enrollment public.cohort_enrollments;
BEGIN
  -- Lock the cohort row to prevent concurrent enrollments
  SELECT * INTO v_cohort
  FROM public.cohorts
  WHERE id = p_cohort_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COHORT_NOT_FOUND: Cohort does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  -- Check cohort status
  IF v_cohort.status NOT IN ('upcoming', 'active') THEN
    RAISE EXCEPTION 'COHORT_NOT_OPEN: Cohort is not accepting enrollments (status: %)', v_cohort.status
      USING ERRCODE = 'P0003';
  END IF;

  -- Check for existing enrollment
  IF EXISTS (
    SELECT 1 FROM public.cohort_enrollments
    WHERE cohort_id = p_cohort_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_ENROLLED: User is already enrolled in this cohort'
      USING ERRCODE = '23505';
  END IF;

  -- Check capacity if max_students is set
  IF v_cohort.max_students IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.cohort_enrollments
    WHERE cohort_id = p_cohort_id
      AND status IN ('active', 'paused');

    IF v_current_count >= v_cohort.max_students THEN
      RAISE EXCEPTION 'COHORT_FULL: Cohort has reached capacity (% of % spots)', v_current_count, v_cohort.max_students
        USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Create the enrollment
  INSERT INTO public.cohort_enrollments (cohort_id, user_id, status, completed_lessons, progress)
  VALUES (
    p_cohort_id,
    p_user_id,
    'active',
    0,
    '{"completed_lessons": 0, "completed_modules": 0, "percentage": 0}'::jsonb
  )
  RETURNING * INTO v_enrollment;

  RETURN v_enrollment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to atomically create assignment submission
-- Combines permission check, submission_number calculation, and insert in one transaction
--
-- This function prevents race conditions in concurrent submissions by:
-- 1. Locking the assignment row to serialize submission attempts
-- 2. Verifying submission permission using can_user_submit logic
-- 3. Calculating the next submission_number atomically
-- 4. Inserting the submission record
--
-- Error Codes (for API error handling):
--   P0002 / ASSIGNMENT_NOT_FOUND     - Assignment does not exist
--   P0003 / ASSIGNMENT_NOT_PUBLISHED - Assignment is not published
--   P0004 / SUBMISSIONS_CLOSED       - Past due date and late submissions not allowed
--   P0005 / RESUBMISSION_NOT_ALLOWED - Resubmissions are disabled and user already submitted
--   P0006 / MAX_SUBMISSIONS_REACHED  - User has reached the maximum submission limit
--
-- Parameters:
--   p_assignment_id  - UUID of the assignment
--   p_user_id        - UUID of the submitting user
--   p_file_url       - Storage path to the uploaded file
--   p_file_name      - Original filename
--   p_file_size_bytes - File size in bytes
--   p_file_type      - File extension/type
--
-- Returns: The created assignment_submissions row
--
CREATE OR REPLACE FUNCTION public.create_assignment_submission(
  p_assignment_id UUID,
  p_user_id UUID,
  p_file_url TEXT,
  p_file_name TEXT,
  p_file_size_bytes BIGINT,
  p_file_type TEXT
)
RETURNS public.assignment_submissions AS $$
DECLARE
  v_assignment RECORD;
  v_submission_count INTEGER;
  v_next_submission_number INTEGER;
  v_is_late BOOLEAN;
  v_submission public.assignment_submissions;
BEGIN
  -- Lock the assignment row to serialize concurrent submissions
  SELECT
    id,
    is_published,
    due_date,
    allow_late_submissions,
    allow_resubmission,
    max_submissions
  INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  -- Check assignment exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ASSIGNMENT_NOT_FOUND: Assignment does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  -- Check assignment is published
  IF NOT v_assignment.is_published THEN
    RAISE EXCEPTION 'ASSIGNMENT_NOT_PUBLISHED: Assignment is not published'
      USING ERRCODE = 'P0003';
  END IF;

  -- Determine if submission is late
  v_is_late := v_assignment.due_date IS NOT NULL AND v_assignment.due_date < NOW();

  -- Check due date if not allowing late submissions
  IF v_is_late AND NOT COALESCE(v_assignment.allow_late_submissions, TRUE) THEN
    RAISE EXCEPTION 'SUBMISSIONS_CLOSED: Submissions are closed for this assignment'
      USING ERRCODE = 'P0004';
  END IF;

  -- Count existing submissions and calculate next number atomically
  SELECT COUNT(*), COALESCE(MAX(submission_number), 0) + 1
  INTO v_submission_count, v_next_submission_number
  FROM public.assignment_submissions
  WHERE assignment_id = p_assignment_id
    AND user_id = p_user_id;

  -- Check resubmission rules
  IF v_submission_count > 0 THEN
    IF NOT COALESCE(v_assignment.allow_resubmission, FALSE) THEN
      RAISE EXCEPTION 'RESUBMISSION_NOT_ALLOWED: Resubmissions are not allowed for this assignment'
        USING ERRCODE = 'P0005';
    END IF;

    -- Check max submissions limit
    IF v_assignment.max_submissions IS NOT NULL
       AND v_submission_count >= v_assignment.max_submissions THEN
      RAISE EXCEPTION 'MAX_SUBMISSIONS_REACHED: Maximum submission limit (%) reached', v_assignment.max_submissions
        USING ERRCODE = 'P0006';
    END IF;
  END IF;

  -- Create the submission
  INSERT INTO public.assignment_submissions (
    assignment_id,
    user_id,
    file_url,
    file_name,
    file_size_bytes,
    file_type,
    submission_number,
    submitted_at,
    is_late,
    status
  )
  VALUES (
    p_assignment_id,
    p_user_id,
    p_file_url,
    p_file_name,
    p_file_size_bytes,
    p_file_type,
    v_next_submission_number,
    NOW(),
    v_is_late,
    'submitted'
  )
  RETURNING * INTO v_submission;

  RETURN v_submission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for all tables with that column
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON cohorts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_discussions_updated_at BEFORE UPDATE ON lesson_discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_forums_updated_at BEFORE UPDATE ON course_forums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_templates_updated_at BEFORE UPDATE ON certificate_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_library_updated_at BEFORE UPDATE ON media_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Applications policies
CREATE POLICY "Users view own applications" ON applications FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users create own applications" ON applications FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own applications" ON applications FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Admins view all applications" ON applications FOR SELECT USING (is_admin((select auth.uid())));
CREATE POLICY "Admins update applications" ON applications FOR UPDATE USING (is_admin((select auth.uid())));

-- Profiles policies
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING ((select auth.uid()) = id);
CREATE POLICY "Public view profiles" ON profiles FOR SELECT USING (true);

-- Courses policies
CREATE POLICY "Public view published courses" ON courses FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Teachers manage own courses" ON courses FOR ALL USING (created_by = (select auth.uid()));
CREATE POLICY "Admins manage all courses" ON courses FOR ALL USING (is_admin((select auth.uid())));

-- Modules policies
CREATE POLICY "View modules of published courses" ON modules FOR SELECT USING (
  course_id IN (SELECT id FROM courses WHERE is_published = TRUE)
);
CREATE POLICY "Teachers manage own modules" ON modules FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE created_by = (select auth.uid()))
);

-- Lessons policies
CREATE POLICY "View preview lessons" ON lessons FOR SELECT USING (is_preview = TRUE);
CREATE POLICY "View lessons of enrolled courses" ON lessons FOR SELECT USING (
  module_id IN (
    SELECT m.id FROM modules m
    JOIN enrollments e ON e.course_id = m.course_id
    WHERE e.user_id = (select auth.uid())
  )
);
CREATE POLICY "Teachers manage own lessons" ON lessons FOR ALL USING (
  module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);

-- Lesson progress policies
CREATE POLICY "Users manage own progress" ON lesson_progress FOR ALL USING ((select auth.uid()) = user_id);

-- Enrollments policies
CREATE POLICY "Users view own enrollments" ON enrollments FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users create own enrollments" ON enrollments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Service role manages enrollments" ON enrollments FOR ALL USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Cohort policies
CREATE POLICY "View enrolled cohorts" ON cohorts FOR SELECT USING (
  id IN (SELECT cohort_id FROM cohort_enrollments WHERE user_id = (select auth.uid()))
);
CREATE POLICY "View upcoming cohorts" ON cohorts FOR SELECT USING (
  status = 'upcoming' AND course_id IN (SELECT id FROM courses WHERE is_published = TRUE)
);
CREATE POLICY "Teachers manage own cohorts" ON cohorts FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE created_by = (select auth.uid()))
);

-- Cohort enrollments policies
CREATE POLICY "Users view own cohort enrollments" ON cohort_enrollments FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users create own cohort enrollments" ON cohort_enrollments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own cohort enrollments" ON cohort_enrollments FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Teachers view cohort students" ON cohort_enrollments FOR SELECT USING (
  cohort_id IN (
    SELECT c.id FROM cohorts c
    JOIN courses co ON c.course_id = co.id
    WHERE co.created_by = (select auth.uid())
  )
);
CREATE POLICY "Teachers enroll students in own cohorts" ON cohort_enrollments FOR INSERT WITH CHECK (
  cohort_id IN (
    SELECT c.id FROM cohorts c
    JOIN courses co ON c.course_id = co.id
    WHERE co.created_by = (select auth.uid())
  )
);
CREATE POLICY "Teachers update cohort enrollments" ON cohort_enrollments FOR UPDATE USING (
  cohort_id IN (
    SELECT c.id FROM cohorts c
    JOIN courses co ON c.course_id = co.id
    WHERE co.created_by = (select auth.uid())
  )
);
CREATE POLICY "Teachers delete cohort enrollments" ON cohort_enrollments FOR DELETE USING (
  cohort_id IN (
    SELECT c.id FROM cohorts c
    JOIN courses co ON c.course_id = co.id
    WHERE co.created_by = (select auth.uid())
  )
);

-- Cohort schedules policies
-- Students can view schedules for cohorts they are enrolled in
CREATE POLICY "Students view enrolled cohort schedules" ON cohort_schedules FOR SELECT USING (
  cohort_id IN (SELECT cohort_id FROM cohort_enrollments WHERE user_id = (select auth.uid()))
);
-- Teachers can manage schedules for their own courses' cohorts
CREATE POLICY "Teachers manage own cohort schedules" ON cohort_schedules FOR ALL USING (
  cohort_id IN (
    SELECT c.id FROM cohorts c
    JOIN courses co ON c.course_id = co.id
    WHERE co.created_by = (select auth.uid())
  )
);

-- Quiz policies
CREATE POLICY "View published quizzes" ON quizzes FOR SELECT USING (
  is_published = TRUE AND course_id IN (SELECT course_id FROM enrollments WHERE user_id = (select auth.uid()))
);
CREATE POLICY "Teachers manage own quizzes" ON quizzes FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE created_by = (select auth.uid()))
);

-- Quiz attempts policies
CREATE POLICY "Users manage own attempts" ON quiz_attempts FOR ALL USING ((select auth.uid()) = user_id);
CREATE POLICY "Teachers view student attempts" ON quiz_attempts FOR SELECT USING (
  quiz_id IN (
    SELECT q.id FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);

-- Assignment policies
CREATE POLICY "View published assignments" ON assignments FOR SELECT USING (
  is_published = TRUE AND course_id IN (SELECT course_id FROM enrollments WHERE user_id = (select auth.uid()))
);
CREATE POLICY "Teachers manage own assignments" ON assignments FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE created_by = (select auth.uid()))
);

-- Submission policies
CREATE POLICY "Users manage own submissions" ON assignment_submissions FOR ALL USING ((select auth.uid()) = user_id);
CREATE POLICY "Teachers view submissions" ON assignment_submissions FOR SELECT USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);
CREATE POLICY "Teachers grade submissions" ON assignment_submissions FOR UPDATE USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);

-- Message policies
CREATE POLICY "Users view own threads" ON message_threads FOR SELECT USING ((select auth.uid()) = ANY(participant_ids));
CREATE POLICY "Users create threads" ON message_threads FOR INSERT WITH CHECK ((select auth.uid()) = ANY(participant_ids));
CREATE POLICY "Users view thread messages" ON messages FOR SELECT USING (
  thread_id IN (SELECT id FROM message_threads WHERE (select auth.uid()) = ANY(participant_ids))
);
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (
  (select auth.uid()) = sender_id AND
  thread_id IN (SELECT id FROM message_threads WHERE (select auth.uid()) = ANY(participant_ids))
);

-- Notification policies
CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING ((select auth.uid()) = user_id);

-- AI conversation policies
CREATE POLICY "Users manage own conversations" ON ai_conversations FOR ALL USING ((select auth.uid()) = user_id);
CREATE POLICY "Users manage own messages" ON ai_messages FOR ALL USING (
  conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = (select auth.uid()))
);
CREATE POLICY "Users view own usage" ON ai_usage_logs FOR SELECT USING ((select auth.uid()) = user_id);

-- Certificate policies
CREATE POLICY "Users view own certificates" ON certificates FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Public verify certificates" ON certificates FOR SELECT USING (true);
CREATE POLICY "Public view templates" ON certificate_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage templates" ON certificate_templates FOR ALL USING (is_admin((select auth.uid())));

-- Payment policies
CREATE POLICY "Users view own payments" ON payments FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users view own subscription" ON subscriptions FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Admins view all payments" ON payments FOR SELECT USING (is_admin((select auth.uid())));

-- Media policies
CREATE POLICY "Users view own media" ON media_library FOR SELECT USING (uploaded_by = (select auth.uid()));
CREATE POLICY "View public media" ON media_library FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users upload media" ON media_library FOR INSERT WITH CHECK ((select auth.uid()) = uploaded_by);
CREATE POLICY "Users update own media" ON media_library FOR UPDATE USING (uploaded_by = (select auth.uid()));

-- Analytics policies
CREATE POLICY "Users view own analytics" ON analytics_events FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "System creates events" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view all analytics" ON analytics_events FOR SELECT USING (is_admin((select auth.uid())));

-- Blog posts policies
CREATE POLICY "Public view published blog posts" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins manage all blog posts" ON blog_posts FOR ALL USING (is_admin((select auth.uid())));

-- Auth logs policies (service role only)
CREATE POLICY "Service role manages auth logs" ON auth_logs FOR ALL USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- ============================================================================
-- QUIZ QUESTIONS POLICIES
-- ============================================================================
-- Quiz questions contain correct answers and should only be accessible to:
-- 1. Teachers/admins who own the quiz's course
-- 2. NOT directly accessible by students (they get questions through quiz attempt APIs)

-- Teachers can manage questions for their own courses
CREATE POLICY "Teachers manage quiz questions" ON quiz_questions FOR ALL USING (
  quiz_id IN (
    SELECT q.id FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);

-- Admins can manage all quiz questions
CREATE POLICY "Admins manage all quiz questions" ON quiz_questions FOR ALL USING (
  is_admin((select auth.uid()))
);

-- ============================================================================
-- ASSIGNMENT RUBRICS POLICIES
-- ============================================================================
-- Rubrics are teacher/admin only - students should not see grading criteria directly

-- Teachers can manage rubrics for their own courses' assignments
CREATE POLICY "Teachers manage assignment rubrics" ON assignment_rubrics FOR ALL USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);

-- Admins can manage all rubrics
CREATE POLICY "Admins manage all rubrics" ON assignment_rubrics FOR ALL USING (
  is_admin((select auth.uid()))
);

-- ============================================================================
-- LESSON DISCUSSIONS POLICIES
-- ============================================================================
-- Students can participate in discussions for lessons they're enrolled in
-- Teachers can moderate discussions in their courses

-- Users can view discussions in their enrolled courses
CREATE POLICY "Users view lesson discussions" ON lesson_discussions FOR SELECT USING (
  -- User is enrolled in the cohort OR is the course teacher/admin
  cohort_id IN (
    SELECT ce.cohort_id FROM cohort_enrollments ce
    WHERE ce.user_id = (select auth.uid()) AND ce.status IN ('active', 'completed')
  )
  OR
  lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
  OR is_admin((select auth.uid()))
);

-- Users can create discussions in their enrolled cohorts
CREATE POLICY "Users create lesson discussions" ON lesson_discussions FOR INSERT WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    cohort_id IN (
      SELECT ce.cohort_id FROM cohort_enrollments ce
      WHERE ce.user_id = (select auth.uid()) AND ce.status = 'active'
    )
    OR lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE c.created_by = (select auth.uid())
    )
  )
);

-- Users can update their own discussions
CREATE POLICY "Users update own discussions" ON lesson_discussions FOR UPDATE USING (
  (select auth.uid()) = user_id
);

-- Teachers can update/delete discussions in their courses (moderation)
CREATE POLICY "Teachers moderate lesson discussions" ON lesson_discussions FOR UPDATE USING (
  lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
);

CREATE POLICY "Teachers delete lesson discussions" ON lesson_discussions FOR DELETE USING (
  lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE c.created_by = (select auth.uid())
  )
  OR (select auth.uid()) = user_id
);

-- Admins can manage all discussions
CREATE POLICY "Admins manage lesson discussions" ON lesson_discussions FOR ALL USING (
  is_admin((select auth.uid()))
);

-- ============================================================================
-- COURSE FORUMS POLICIES
-- ============================================================================
-- Forums for general course discussions by cohort

-- Users can view forum posts in their enrolled courses/cohorts
CREATE POLICY "Users view forum posts" ON course_forums FOR SELECT USING (
  -- User is enrolled in the cohort
  cohort_id IN (
    SELECT ce.cohort_id FROM cohort_enrollments ce
    WHERE ce.user_id = (select auth.uid()) AND ce.status IN ('active', 'completed')
  )
  OR
  -- User is the course teacher
  course_id IN (
    SELECT id FROM courses WHERE created_by = (select auth.uid())
  )
  OR is_admin((select auth.uid()))
);

-- Users can create forum posts in their enrolled cohorts
CREATE POLICY "Users create forum posts" ON course_forums FOR INSERT WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    cohort_id IN (
      SELECT ce.cohort_id FROM cohort_enrollments ce
      WHERE ce.user_id = (select auth.uid()) AND ce.status = 'active'
    )
    OR course_id IN (
      SELECT id FROM courses WHERE created_by = (select auth.uid())
    )
  )
);

-- Users can update their own forum posts (unless locked)
CREATE POLICY "Users update own forum posts" ON course_forums FOR UPDATE USING (
  (select auth.uid()) = user_id AND is_locked = FALSE
);

-- Teachers can update/lock forum posts in their courses (moderation)
CREATE POLICY "Teachers moderate forum posts" ON course_forums FOR UPDATE USING (
  course_id IN (
    SELECT id FROM courses WHERE created_by = (select auth.uid())
  )
);

CREATE POLICY "Teachers delete forum posts" ON course_forums FOR DELETE USING (
  course_id IN (
    SELECT id FROM courses WHERE created_by = (select auth.uid())
  )
  OR (select auth.uid()) = user_id
);

-- Admins can manage all forum posts
CREATE POLICY "Admins manage forum posts" ON course_forums FOR ALL USING (
  is_admin((select auth.uid()))
);

-- ============================================================================
-- FORUM REPLIES POLICIES
-- ============================================================================
-- Replies to forum posts follow similar rules

-- Users can view replies in forums they can access
CREATE POLICY "Users view forum replies" ON forum_replies FOR SELECT USING (
  forum_post_id IN (
    SELECT cf.id FROM course_forums cf
    WHERE cf.cohort_id IN (
      SELECT ce.cohort_id FROM cohort_enrollments ce
      WHERE ce.user_id = (select auth.uid()) AND ce.status IN ('active', 'completed')
    )
    OR cf.course_id IN (
      SELECT id FROM courses WHERE created_by = (select auth.uid())
    )
  )
  OR is_admin((select auth.uid()))
);

-- Users can create replies in forums they can access (and post is not locked)
CREATE POLICY "Users create forum replies" ON forum_replies FOR INSERT WITH CHECK (
  (select auth.uid()) = user_id
  AND forum_post_id IN (
    SELECT cf.id FROM course_forums cf
    WHERE cf.is_locked = FALSE
    AND (
      cf.cohort_id IN (
        SELECT ce.cohort_id FROM cohort_enrollments ce
        WHERE ce.user_id = (select auth.uid()) AND ce.status = 'active'
      )
      OR cf.course_id IN (
        SELECT id FROM courses WHERE created_by = (select auth.uid())
      )
    )
  )
);

-- Users can update their own replies
CREATE POLICY "Users update own forum replies" ON forum_replies FOR UPDATE USING (
  (select auth.uid()) = user_id
);

-- Teachers can moderate replies in their courses
CREATE POLICY "Teachers moderate forum replies" ON forum_replies FOR UPDATE USING (
  forum_post_id IN (
    SELECT cf.id FROM course_forums cf
    WHERE cf.course_id IN (
      SELECT id FROM courses WHERE created_by = (select auth.uid())
    )
  )
);

CREATE POLICY "Teachers delete forum replies" ON forum_replies FOR DELETE USING (
  forum_post_id IN (
    SELECT cf.id FROM course_forums cf
    WHERE cf.course_id IN (
      SELECT id FROM courses WHERE created_by = (select auth.uid())
    )
  )
  OR (select auth.uid()) = user_id
);

-- Admins can manage all forum replies
CREATE POLICY "Admins manage forum replies" ON forum_replies FOR ALL USING (
  is_admin((select auth.uid()))
);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_fulltext ON courses
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_lessons_fulltext ON lessons
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm ON courses USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_title_trgm ON lessons USING GIN(title gin_trgm_ops);

-- ============================================================================
-- FOREIGN KEY INDEXES (Performance optimization)
-- ============================================================================

-- ai_conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_course ON ai_conversations(course_id);

-- applications
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by ON applications(reviewed_by);

-- assignments
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

-- certificate_templates
CREATE INDEX IF NOT EXISTS idx_certificate_templates_created_by ON certificate_templates(created_by);

-- certificates
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_template ON certificates(template_id);

-- cohorts
CREATE INDEX IF NOT EXISTS idx_cohorts_created_by ON cohorts(created_by);

-- courses
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);

-- quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_graded_by ON quiz_attempts(graded_by);

-- quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);

-- assignment_submissions
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions(graded_by);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- SCHEMA SUMMARY:
--   - 34 tables (32 data tables + 2 auth tables)
--   - 1 materialized view (student_roster_view)
--   - 7 tables with cohort_id foreign keys (see COHORT SYSTEM section)
--   - 80+ indexes (including 7 cohort_id indexes)
--   - 17 triggers (updated_at automation)
--   - 50+ RLS policies (role-based access control)
--   - 18 functions (helpers, enrollment, grading)
-- ============================================================================
