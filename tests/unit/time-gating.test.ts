/**
 * Time-Gating Utility Functions Unit Tests
 *
 * Tests all time-gating logic including:
 * - Module unlock/lock checking
 * - Lesson access validation
 * - Date formatting utilities
 * - Teacher overrides
 *
 * Date Semantics:
 * - All date comparisons use date-only values (YYYY-MM-DD)
 * - unlock_date and lock_date are stored as DATE type in the database
 * - cohort_id is a UUID string (not number) per schema.sql
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  isModuleUnlocked,
  getUnlockDate,
  canAccessLesson,
  getCohortModuleStatuses,
  formatUnlockDate,
  getDaysUntilUnlock
} from '@/lib/time-gating';

// Mock Supabase client
const createMockSupabase = () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        single: vi.fn()
      })),
      single: vi.fn()
    }))
  }))
});

// Test cohort ID as UUID string (per schema.sql)
const TEST_COHORT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TEST_MODULE_ID = 1;
const TEST_USER_ID = 'user-123-uuid';

describe('Time-Gating Utility Functions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. isModuleUnlocked() Tests
  // ============================================================================

  describe('isModuleUnlocked()', () => {
    test('should return unlocked for teacher override', async () => {
      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, true);

      expect(result.isUnlocked).toBe(true);
      expect(result.reason).toBe('teacher_override');
      expect(result.unlockDate).toBeNull();
      expect(result.lockDate).toBeNull();
    });

    test('should throw error if moduleId is missing', async () => {
      await expect(
        isModuleUnlocked(null as any, TEST_COHORT_ID, mockSupabase)
      ).rejects.toThrow('moduleId and cohortId are required');
    });

    test('should throw error if cohortId is missing', async () => {
      await expect(
        isModuleUnlocked(TEST_MODULE_ID, null as any, mockSupabase)
      ).rejects.toThrow('moduleId and cohortId are required');
    });

    test('should throw error if supabase client is missing', async () => {
      await expect(
        isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, null as any)
      ).rejects.toThrow('Supabase client is required');
    });

    test('should return not_scheduled if no schedule exists', async () => {
      // Mock query to return null (no schedule)
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
            })
          })
        })
      });

      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, false);

      expect(result.isUnlocked).toBe(true);
      expect(result.reason).toBe('not_scheduled');
    });

    test('should return unlocked if today >= unlock_date and no lock_date (date-only comparison)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  unlock_date: yesterday.toISOString().split('T')[0],
                  lock_date: null
                },
                error: null
              })
            })
          })
        })
      });

      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, false);

      expect(result.isUnlocked).toBe(true);
      expect(result.reason).toBe('unlocked');
    });

    test('should return locked if today < unlock_date (date-only comparison)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  unlock_date: tomorrow.toISOString().split('T')[0],
                  lock_date: null
                },
                error: null
              })
            })
          })
        })
      });

      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, false);

      expect(result.isUnlocked).toBe(false);
      expect(result.reason).toBe('locked');
    });

    test('should return unlocked if today >= unlock_date and today < lock_date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  unlock_date: yesterday.toISOString().split('T')[0],
                  lock_date: tomorrow.toISOString().split('T')[0]
                },
                error: null
              })
            })
          })
        })
      });

      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, false);

      expect(result.isUnlocked).toBe(true);
      expect(result.reason).toBe('unlocked');
    });

    test('should return locked if today >= lock_date (date-only comparison)', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  unlock_date: twoDaysAgo.toISOString().split('T')[0],
                  lock_date: yesterday.toISOString().split('T')[0]
                },
                error: null
              })
            })
          })
        })
      });

      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, false);

      expect(result.isUnlocked).toBe(false);
      expect(result.reason).toBe('locked');
    });

    test('should handle edge case: unlock_date is today (should be unlocked)', async () => {
      const today = new Date();

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  unlock_date: today.toISOString().split('T')[0],
                  lock_date: null
                },
                error: null
              })
            })
          })
        })
      });

      const result = await isModuleUnlocked(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase, false);

      expect(result.isUnlocked).toBe(true);
      expect(result.reason).toBe('unlocked');
    });
  });

  // ============================================================================
  // 2. getUnlockDate() Tests
  // ============================================================================

  describe('getUnlockDate()', () => {
    test('should return unlock date if schedule exists', async () => {
      const unlockDate = new Date('2025-03-15');

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  unlock_date: unlockDate.toISOString().split('T')[0]
                },
                error: null
              })
            })
          })
        })
      });

      const result = await getUnlockDate(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().split('T')[0]).toBe('2025-03-15');
    });

    test('should return null if no schedule exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      });

      const result = await getUnlockDate(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase);

      expect(result).toBeNull();
    });

    test('should throw error if moduleId is missing', async () => {
      await expect(
        getUnlockDate(null as any, TEST_COHORT_ID, mockSupabase)
      ).rejects.toThrow('moduleId and cohortId are required');
    });

    test('should throw error if cohortId is missing', async () => {
      await expect(
        getUnlockDate(TEST_MODULE_ID, null as any, mockSupabase)
      ).rejects.toThrow('moduleId and cohortId are required');
    });

    test('should throw error if supabase client is missing', async () => {
      await expect(
        getUnlockDate(TEST_MODULE_ID, TEST_COHORT_ID, null as any)
      ).rejects.toThrow('Supabase client is required');
    });

    test('should return date normalized to UTC midnight (consistent with isModuleUnlocked)', async () => {
      // This test ensures getUnlockDate normalizes dates the same way isModuleUnlocked does
      const dateString = '2025-06-15';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { unlock_date: dateString },
                error: null
              })
            })
          })
        })
      });

      const result = await getUnlockDate(TEST_MODULE_ID, TEST_COHORT_ID, mockSupabase);

      // Should be normalized to UTC midnight
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-06-15T00:00:00.000Z');
      // Calendar date should match regardless of local timezone
      expect(result?.toISOString().split('T')[0]).toBe(dateString);
    });
  });

  // ============================================================================
  // 3. canAccessLesson() Tests
  // ============================================================================

  describe('canAccessLesson()', () => {
    test('should return accessible for teacher override', async () => {
      const result = await canAccessLesson(TEST_MODULE_ID, TEST_USER_ID, mockSupabase, true);

      expect(result.canAccess).toBe(true);
      expect(result.moduleUnlocked).toBe(true);
      expect(result.isEnrolled).toBe(true);
      expect(result.reason).toBe('teacher_override');
    });

    test('should throw error if lessonId is missing', async () => {
      await expect(
        canAccessLesson(null as any, TEST_USER_ID, mockSupabase)
      ).rejects.toThrow('lessonId and userId are required');
    });

    test('should throw error if userId is missing', async () => {
      await expect(
        canAccessLesson(TEST_MODULE_ID, null as any, mockSupabase)
      ).rejects.toThrow('lessonId and userId are required');
    });

    test('should throw error if supabase client is missing', async () => {
      await expect(
        canAccessLesson(TEST_MODULE_ID, TEST_USER_ID, null as any)
      ).rejects.toThrow('Supabase client is required');
    });

    test('should return not_enrolled if lesson query fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const result = await canAccessLesson(TEST_MODULE_ID, TEST_USER_ID, mockSupabase, false);

      expect(result.canAccess).toBe(false);
      expect(result.isEnrolled).toBe(false);
      expect(result.reason).toBe('not_enrolled');
    });

    test('should return not_enrolled if user has no cohort enrollment', async () => {
      // Mock lesson query success
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                module_id: 10,
                modules: { id: 10, course_id: 100 }
              },
              error: null
            })
          })
        })
      });

      // Mock cohort enrollment query failure (no cohort enrollment found)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' }
                  })
                })
              })
            })
          })
        })
      });

      // Mock regular enrollment query failure (no regular enrollment either)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' }
                  })
                })
              })
            })
          })
        })
      });

      const result = await canAccessLesson(TEST_MODULE_ID, TEST_USER_ID, mockSupabase, false);

      expect(result.canAccess).toBe(false);
      expect(result.isEnrolled).toBe(false);
      expect(result.reason).toBe('not_enrolled');
    });
  });

  // ============================================================================
  // 4. getCohortModuleStatuses() Tests
  // ============================================================================

  describe('getCohortModuleStatuses()', () => {
    test('should return empty map for teacher override', async () => {
      const result = await getCohortModuleStatuses(TEST_COHORT_ID, mockSupabase, true);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test('should throw error if cohortId is missing', async () => {
      await expect(
        getCohortModuleStatuses(null as any, mockSupabase)
      ).rejects.toThrow('cohortId is required');
    });

    test('should throw error if supabase client is missing', async () => {
      await expect(
        getCohortModuleStatuses(TEST_COHORT_ID, null as any)
      ).rejects.toThrow('Supabase client is required');
    });

    test('should return empty map if no schedules exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      });

      const result = await getCohortModuleStatuses(TEST_COHORT_ID, mockSupabase, false);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test('should return map of module statuses with date-only comparison', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                module_id: 1,
                unlock_date: yesterday.toISOString().split('T')[0],
                lock_date: null
              },
              {
                module_id: 2,
                unlock_date: tomorrow.toISOString().split('T')[0],
                lock_date: null
              }
            ],
            error: null
          })
        })
      });

      const result = await getCohortModuleStatuses(TEST_COHORT_ID, mockSupabase, false);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get(1)?.isUnlocked).toBe(true);
      expect(result.get(2)?.isUnlocked).toBe(false);
    });
  });

  // ============================================================================
  // 5. Utility Functions Tests
  // ============================================================================

  describe('formatUnlockDate()', () => {
    test('should format date correctly', () => {
      const date = new Date('2025-03-15');
      const result = formatUnlockDate(date);

      expect(result).toBe('March 15, 2025');
    });

    test('should return "Not scheduled" for null date', () => {
      const result = formatUnlockDate(null);

      expect(result).toBe('Not scheduled');
    });
  });

  describe('getDaysUntilUnlock()', () => {
    test('should return 0 for null date', () => {
      const result = getDaysUntilUnlock(null);

      expect(result).toBe(0);
    });

    test('should return positive days for future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);

      const result = getDaysUntilUnlock(future);

      expect(result).toBe(5);
    });

    test('should return negative days for past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);

      const result = getDaysUntilUnlock(past);

      expect(result).toBe(-3);
    });

    test('should return 0 for today', () => {
      const today = new Date();

      const result = getDaysUntilUnlock(today);

      expect(result).toBe(0);
    });
  });
});
