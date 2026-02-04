/**
 * Time-Gating Utilities
 *
 * Logic for controlling access to content based on cohort schedules.
 *
 * Date Semantics:
 * - unlock_date and lock_date are stored as DATE (YYYY-MM-DD) in the database
 * - All comparisons are done using date-only values (no time component)
 * - Dates are normalized to UTC midnight for consistent comparison
 * - A module is unlocked when today's date >= unlock_date (date-only comparison)
 * - A module is locked when today's date >= lock_date (date-only comparison)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CohortSchedule } from '@/types';

export type ModuleUnlockStatus = {
  isUnlocked: boolean;
  unlockDate: Date | null;
  lockDate: Date | null;
  reason: 'teacher_override' | 'not_scheduled' | 'unlocked' | 'locked';
};

export type LessonAccessStatus = {
  canAccess: boolean;
  moduleUnlocked: boolean;
  isEnrolled: boolean;
  reason: 'teacher_override' | 'not_enrolled' | 'module_locked' | 'accessible';
};

/**
 * Normalizes a date to UTC midnight for date-only comparison.
 * This ensures consistent comparison between database DATE values (YYYY-MM-DD)
 * and JavaScript Date objects regardless of local timezone.
 *
 * @param date - Date object or ISO date string (YYYY-MM-DD)
 * @returns Date object normalized to UTC midnight
 */
function toDateOnly(date: Date | string): Date {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Gets today's date normalized to UTC midnight for date-only comparison.
 * @returns Today's date as UTC midnight
 */
function getTodayDateOnly(): Date {
  return toDateOnly(new Date().toISOString().split('T')[0]);
}

/**
 * Checks if a module is unlocked for a specific cohort.
 * @param moduleId - BIGINT matching schema.sql modules.id (BIGSERIAL primary key)
 * @param cohortId - UUID string matching schema.sql cohorts.id
 */
export async function isModuleUnlocked(
  moduleId: number, // BIGINT - matches schema.sql modules.id (BIGSERIAL)
  cohortId: string, // UUID - must be string to match schema.sql cohorts.id
  supabase: SupabaseClient,
  teacherOverride: boolean = false
): Promise<ModuleUnlockStatus> {
  if (!moduleId || !cohortId) {
    throw new Error('moduleId and cohortId are required');
  }
  if (!supabase) {
    throw new Error('Supabase client is required');
  }

  if (teacherOverride) {
    return {
      isUnlocked: true,
      unlockDate: null,
      lockDate: null,
      reason: 'teacher_override'
    };
  }

  const { data, error } = await supabase
    .from('cohort_schedules')
    .select('unlock_date, lock_date')
    .eq('cohort_id', cohortId)
    .eq('module_id', moduleId)
    .single();

  if (error || !data) {
    // If no schedule exists, it's considered not scheduled (and thus accessible/visible but maybe marked as such)
    // Tests say: return not_scheduled, isUnlocked: true
    return {
      isUnlocked: true,
      unlockDate: null,
      lockDate: null,
      reason: 'not_scheduled'
    };
  }

  // Use date-only comparison for consistent semantics with database DATE type
  const todayDate = getTodayDateOnly();
  const unlockDate = toDateOnly(data.unlock_date);
  const lockDate = data.lock_date ? toDateOnly(data.lock_date) : null;

  // Module is locked if today < unlock_date
  if (todayDate < unlockDate) {
    return {
      isUnlocked: false,
      unlockDate,
      lockDate,
      reason: 'locked'
    };
  }

  // Module is re-locked if today >= lock_date
  if (lockDate && todayDate >= lockDate) {
    return {
      isUnlocked: false,
      unlockDate,
      lockDate,
      reason: 'locked'
    };
  }

  return {
    isUnlocked: true,
    unlockDate,
    lockDate,
    reason: 'unlocked'
  };
}

/**
 * Gets the unlock date for a module in a cohort.
 *
 * The returned Date is normalized to UTC midnight using toDateOnly(),
 * ensuring consistency with isModuleUnlocked() date comparisons.
 * This is a date-only value representing the calendar date, not a wall-clock time.
 *
 * @param moduleId - BIGINT matching schema.sql modules.id (BIGSERIAL primary key)
 * @param cohortId - UUID string matching schema.sql cohorts.id
 * @returns Date normalized to UTC midnight, or null if no schedule exists
 */
export async function getUnlockDate(
  moduleId: number, // BIGINT - matches schema.sql modules.id (BIGSERIAL)
  cohortId: string, // UUID - must be string to match schema.sql cohorts.id
  supabase: SupabaseClient
): Promise<Date | null> {
  if (!moduleId || !cohortId) {
    throw new Error('moduleId and cohortId are required');
  }
  if (!supabase) {
    throw new Error('Supabase client is required');
  }

  const { data, error } = await supabase
    .from('cohort_schedules')
    .select('unlock_date')
    .eq('cohort_id', cohortId)
    .eq('module_id', moduleId)
    .single();

  if (error || !data) {
    return null;
  }

  // Normalize to UTC midnight for consistency with isModuleUnlocked()
  // This ensures the returned date is treated as a date-only value
  return toDateOnly(data.unlock_date);
}

/**
 * Checks if a user can access a specific lesson.
 * @param lessonId - BIGINT matching schema.sql lessons.id (BIGSERIAL primary key)
 * @param userId - UUID string matching the user's ID
 */
export async function canAccessLesson(
  lessonId: number, // BIGINT - matches schema.sql lessons.id (BIGSERIAL)
  userId: string,
  supabase: SupabaseClient,
  teacherOverride: boolean = false
): Promise<LessonAccessStatus> {
  if (!lessonId || !userId) {
    throw new Error('lessonId and userId are required');
  }
  if (!supabase) {
    throw new Error('Supabase client is required');
  }

  if (teacherOverride) {
    return {
      canAccess: true,
      moduleUnlocked: true,
      isEnrolled: true,
      reason: 'teacher_override'
    };
  }

  // 1. Get lesson's module
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('module_id, modules!inner(course_id)')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    return {
      canAccess: false,
      moduleUnlocked: false,
      isEnrolled: false,
      reason: 'not_enrolled'
    };
  }

  // Extract course_id from the joined modules
  // Handle both array and object cases for defensive coding
  const moduleData = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;
  if (!moduleData || typeof moduleData !== 'object') {
    return {
      canAccess: false,
      moduleUnlocked: false,
      isEnrolled: false,
      reason: 'not_enrolled'
    };
  }
  const courseId = (moduleData as { course_id: number }).course_id;

  // 2. Check user's enrollment - first try cohort enrollment, then fall back to regular enrollment
  const { data: cohortEnrollment } = await supabase
    .from('cohort_enrollments')
    .select('cohort_id, cohorts!inner(course_id)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('cohorts.course_id', courseId)
    .limit(1)
    .single();

  // If user has cohort enrollment, check time-gating
  if (cohortEnrollment) {
    // 3. Check module unlock status for cohort-enrolled users
    const moduleStatus = await isModuleUnlocked(lesson.module_id, cohortEnrollment.cohort_id, supabase);

    if (!moduleStatus.isUnlocked) {
      return {
        canAccess: false,
        moduleUnlocked: false,
        isEnrolled: true,
        reason: 'module_locked'
      };
    }

    return {
      canAccess: true,
      moduleUnlocked: true,
      isEnrolled: true,
      reason: 'accessible'
    };
  }

  // 2b. Fall back to regular enrollment (no time-gating applies)
  const { data: regularEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (regularEnrollment) {
    // Regular enrollment - no time-gating, full access
    return {
      canAccess: true,
      moduleUnlocked: true,
      isEnrolled: true,
      reason: 'accessible'
    };
  }

  // Not enrolled in any way
  return {
    canAccess: false,
    moduleUnlocked: false,
    isEnrolled: false,
    reason: 'not_enrolled'
  };
}

/**
 * Gets the status of all modules for a cohort.
 * @param cohortId - UUID string matching schema.sql cohorts.id
 * @returns Map with module_id (number) as key and ModuleUnlockStatus as value
 */
export async function getCohortModuleStatuses(
  cohortId: string, // UUID - must be string to match schema.sql cohorts.id
  supabase: SupabaseClient,
  teacherOverride: boolean = false
): Promise<Map<number, ModuleUnlockStatus>> {
  if (!cohortId) {
    throw new Error('cohortId is required');
  }
  if (!supabase) {
    throw new Error('Supabase client is required');
  }

  const statuses = new Map<number, ModuleUnlockStatus>();

  if (teacherOverride) {
    return statuses;
  }

  const { data, error } = await supabase
    .from('cohort_schedules')
    .select('module_id, unlock_date, lock_date')
    .eq('cohort_id', cohortId);

  if (error || !data) {
    return statuses;
  }

  // Use date-only comparison for consistent semantics with database DATE type
  const todayDate = getTodayDateOnly();

  (data as CohortSchedule[]).forEach((schedule) => {
    const unlockDate = toDateOnly(schedule.unlock_date);
    const lockDate = schedule.lock_date ? toDateOnly(schedule.lock_date) : null;
    let isUnlocked = true;
    let reason: ModuleUnlockStatus['reason'] = 'unlocked';

    // Module is locked if today < unlock_date
    if (todayDate < unlockDate) {
      isUnlocked = false;
      reason = 'locked';
    } else if (lockDate && todayDate >= lockDate) {
      // Module is re-locked if today >= lock_date
      isUnlocked = false;
      reason = 'locked';
    }

    // module_id is a BIGINT (number) per schema.sql
    statuses.set(schedule.module_id, {
      isUnlocked,
      unlockDate,
      lockDate,
      reason
    });
  });

  return statuses;
}

/**
 * Formats a date string for display.
 */
export function formatUnlockDate(date: Date | null): string {
  if (!date) return 'Not scheduled';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calculates days until unlock using date-only semantics.
 * Returns positive days for future dates, negative for past dates, 0 for today.
 */
export function getDaysUntilUnlock(date: Date | null): number {
  if (!date) return 0;

  // Use date-only comparison for consistency with isModuleUnlocked
  const today = getTodayDateOnly();
  const target = toDateOnly(date);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
