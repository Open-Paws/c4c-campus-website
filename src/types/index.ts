// TypeScript Type Definitions - E-Learning Platform
// Reference: BOOTCAMP_ARCHITECTURE.md lines 193-290 (database schema)
//
// NOTE: These types are thin wrappers over the Supabase-generated types in ./generated.ts
// When modifying types, ensure they remain compatible with the generated schema types.
// Run `npm run db:types` to regenerate types from the database schema.

import type {
  CourseRow,
  ModuleRow,
  LessonRow,
  EnrollmentRow,
  LessonProgressRow,
  CohortRow,
  CohortEnrollmentRow,
  CohortScheduleRow,
  LessonDiscussionRow,
  CourseForumRow,
  ForumReplyRow,
} from './generated';

/**
 * Course - Top-level content container
 * Reference: BOOTCAMP_ARCHITECTURE.md lines 194-207
 *
 * Extends the generated CourseRow type with stricter non-null constraints
 * where the application guarantees values exist.
 */
export interface Course extends Omit<CourseRow, 'track' | 'difficulty' | 'created_by'> {
  track: 'animal_advocacy' | 'climate' | 'ai_safety' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_by: string; // UUID - required in application context
}

/**
 * Module - Groups of lessons within a course
 * Reference: BOOTCAMP_ARCHITECTURE.md lines 214-221
 *
 * Uses the generated ModuleRow type directly.
 */
export type Module = ModuleRow;

/**
 * Lesson - Individual video/content unit
 * Reference: BOOTCAMP_ARCHITECTURE.md lines 226-248
 *
 * Extends LessonRow with typed resources array instead of generic Json.
 */
export interface Lesson extends Omit<LessonRow, 'resources'> {
  resources: Resource[];
}

/**
 * Resource - Downloadable file metadata
 * Stored as JSONB in lessons.resources column
 */
export interface Resource {
  name: string;
  path: string; // Supabase Storage path
  url?: string; // Public/signed URL for direct access
  size: number; // bytes
}

/**
 * Enrollment - User-course relationship
 * Reference: schema.sql enrollments table
 * NOTE: cohort_id is a UUID string (not number) matching schema.sql cohorts.id
 *
 * Uses the generated EnrollmentRow type directly.
 */
export type Enrollment = EnrollmentRow;

/**
 * LessonProgress - Video resume + completion tracking
 * Reference: BOOTCAMP_ARCHITECTURE.md lines 268-286
 *
 * Fields:
 * - completed_at: ISO timestamp when lesson was marked complete (null if not completed)
 * - watch_count: Number of times the student has watched/revisited this lesson
 * - last_accessed_at: ISO timestamp of last access (canonical name matching schema.sql)
 *
 * Uses the generated LessonProgressRow type directly.
 */
export type LessonProgress = LessonProgressRow;

/**
 * API Response Format
 * Reference: BOOTCAMP_ARCHITECTURE.md lines 472-481
 */
export interface APIResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}

/**
 * Course Progress Summary
 * Reference: BOOTCAMP_ARCHITECTURE.md lines 420-434
 */
export interface CourseProgress {
  completed_lessons: number;
  total_lessons: number;
  percentage: number;
  time_spent_hours: number;
  time_spent_seconds: number;
  total_watch_count: number;
  next_lesson: {
    id: number;
    name: string;
    slug: string;
    completed: boolean;
  } | null;
  status?: 'active' | 'completed';
}

/**
 * Validation Result
 * Used by validateCourseInput() and similar validators
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Enrollment Check Result
 * Used by checkEnrollment()
 */
export interface EnrollmentCheck {
  enrolled: boolean;
  enrollment: Enrollment | null;
}

/**
 * Cohort - Time-gated learning groups
 * Reference: schema.sql lines 378-390
 *
 * Extends CohortRow with required created_by field in application context.
 */
export interface Cohort extends Omit<CohortRow, 'created_by'> {
  created_by: string; // UUID - required in application context
}

/**
 * Progress data stored in cohort_enrollments.progress JSONB column
 * This structure matches the default JSON value in schema.sql
 */
export interface CohortProgress {
  completed_lessons: number;
  completed_modules: number;
  percentage?: number; // Optional computed field
  quiz_scores?: Record<string, number>; // quiz_id -> score
  certificates_earned?: string[]; // module slugs or IDs
  current_lesson_id?: number;
}

/**
 * Cohort Enrollment - Students enrolled in specific cohorts
 * Reference: schema.sql cohort_enrollments table
 *
 * Extends CohortEnrollmentRow with typed progress object instead of generic Json.
 */
export interface CohortEnrollment extends Omit<CohortEnrollmentRow, 'progress'> {
  progress: CohortProgress; // Typed JSONB structure
}

/**
 * Cohort Schedule - Module unlock dates for cohorts
 * Reference: schema.sql cohort_schedules table
 *
 * Uses the generated CohortScheduleRow type directly.
 */
export type CohortSchedule = CohortScheduleRow;

/**
 * Student with Progress - Extended student info with progress data
 * Used by teacher dashboard to track student performance
 */
export interface StudentWithProgress {
  user_id: string;
  name: string;
  email: string;
  enrolled_at: string;
  status: 'active' | 'completed' | 'dropped' | 'paused';
  completed_lessons: number;
  total_lessons: number;
  completion_percentage: number;
  last_activity_at: string;
  time_spent_hours: number;
  is_struggling?: boolean; // Less than 20% completion or inactive > 7 days
  days_since_activity: number;
}

/**
 * Cohort Analytics - Aggregated statistics for a cohort
 * Used by teacher dashboard overview
 */
export interface CohortAnalytics {
  cohort_id: string; // UUID - matches schema.sql cohorts.id
  cohort_name: string;
  course_name: string;
  total_students: number;
  active_students: number;
  completed_students: number;
  dropped_students: number;
  average_completion_percentage: number;
  average_time_spent_hours: number;
  struggling_students_count: number;
  engagement_rate: number; // Active in last 7 days
  total_lessons: number;
  most_completed_lesson_id: number | null;
  least_completed_lesson_id: number | null;
  start_date: string;
  end_date: string | null;
  status: 'upcoming' | 'active' | 'completed' | 'archived';
}

/**
 * Progress Over Time - Time-series data for charts
 * Used by ProgressChart component
 */
export interface ProgressOverTime {
  date: string; // ISO date
  completed_lessons: number;
  active_students: number;
  new_enrollments: number;
  average_completion_rate: number;
}

/**
 * Leaderboard Entry - Top performing students
 * Used by Leaderboard component
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  completed_lessons: number;
  completion_percentage: number;
  time_spent_hours: number;
  last_activity_at: string;
}

/**
 * Dashboard Export Data - CSV export format
 * Used by export functionality
 */
export interface DashboardExportData {
  student_name: string;
  email: string;
  enrolled_date: string;
  status: string;
  completed_lessons: number;
  total_lessons: number;
  completion_percentage: number;
  time_spent_hours: number;
  last_activity_date: string;
  days_since_activity: number;
}

/**
 * Lesson Discussion - Threaded comments on lessons
 * Reference: schema.sql lesson_discussions table
 *
 * Uses the generated LessonDiscussionRow type directly.
 * Note: cohort_id is NOT NULL (CASCADE delete behavior)
 */
export type LessonDiscussion = LessonDiscussionRow;

/**
 * Course Forum Post - General discussion topics
 * Reference: schema.sql course_forums table
 *
 * Uses the generated CourseForumRow type directly.
 * Note: cohort_id is NOT NULL (CASCADE delete behavior)
 */
export type CourseForumPost = CourseForumRow;

/**
 * Forum Reply - Replies to forum posts
 * Reference: schema.sql forum_replies table
 *
 * Uses the generated ForumReplyRow type directly.
 */
export type ForumReply = ForumReplyRow;

/**
 * User Profile - Basic user information for display
 * Used in discussion components
 */
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  is_teacher?: boolean;
}

/**
 * Blog categories — single source of truth.
 * Must match the CHECK constraint in schema.sql / migration 00022.
 */
export const BLOG_CATEGORIES = ['News', 'Community', 'Technical', 'Impact'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/**
 * BlogPost - Admin-managed blog content
 * Reference: schema.sql blog_posts table
 *
 * Defined manually until migration is applied and types regenerated.
 * After running migration + `npm run db:types`, replace with generated BlogPostRow.
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  featured_image: string | null;
  category: BlogCategory;
  tags: string[] | null;
  author_id: string | null;
  author_name: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}