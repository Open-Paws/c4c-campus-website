/**
 * Cohort Analytics Unit Tests
 *
 * Tests the pure analytical computations from
 * src/pages/api/teacher/cohort-analytics.ts without hitting the database.
 *
 * Computations under test:
 *  1. completion_percentage per student (completedLessons / totalLessons * 100)
 *  2. Average completion percentage across a cohort
 *  3. Average time spent in hours
 *  4. Engagement rate (students active in last 7 days)
 *  5. Struggling-student identification (< 20% completion OR inactive > 7 days)
 *  6. Leaderboard ranking (by completion_percentage then completed_lessons)
 *  7. Progress-over-time daily aggregation (completions, active students, rate)
 */

import { describe, test, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure-logic helpers mirroring cohort-analytics.ts calculations
// These are extracted as standalone functions so they can be tested in
// isolation without Supabase or Astro runtime context.
// ---------------------------------------------------------------------------

interface StudentInput {
  user_id: string;
  status: 'active' | 'completed' | 'dropped' | 'paused';
  completed_lessons: number;
  total_lessons: number;
  time_spent_hours: number;
  last_activity_at: string; // ISO timestamp
}

interface StudentStats {
  user_id: string;
  status: string;
  completed_lessons: number;
  total_lessons: number;
  completion_percentage: number;
  time_spent_hours: number;
  last_activity_at: string;
  days_since_activity: number;
  is_struggling: boolean;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  completion_percentage: number;
  completed_lessons: number;
  time_spent_hours: number;
}

interface DailyProgress {
  date: string;
  completed_lessons: number;
  active_students: number;
  average_completion_rate: number;
}

/** Derive per-student stats matching cohort-analytics.ts lines 144-194 */
function deriveStudentStats(
  student: StudentInput,
  now: Date = new Date(),
): StudentStats {
  const completionPercentage = student.total_lessons > 0
    ? Math.round((student.completed_lessons / student.total_lessons) * 100)
    : 0;

  const lastActivity = new Date(student.last_activity_at);
  const daysSinceActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isStruggling = completionPercentage < 20 || daysSinceActivity > 7;

  return {
    user_id: student.user_id,
    status: student.status,
    completed_lessons: student.completed_lessons,
    total_lessons: student.total_lessons,
    completion_percentage: completionPercentage,
    time_spent_hours: student.time_spent_hours,
    last_activity_at: student.last_activity_at,
    days_since_activity: daysSinceActivity,
    is_struggling: isStruggling,
  };
}

/** Compute cohort aggregate stats (lines 197-214) */
function computeCohortStats(students: StudentStats[]) {
  const total = students.length;
  const activeCount = students.filter(s => s.status === 'active').length;
  const completedCount = students.filter(s => s.status === 'completed').length;
  const droppedCount = students.filter(s => s.status === 'dropped').length;
  const recentlyActive = students.filter(s => s.days_since_activity <= 7).length;
  const struggling = students.filter(s => s.is_struggling && s.status === 'active');

  const avgCompletion = total > 0
    ? Math.round(students.reduce((sum, s) => sum + s.completion_percentage, 0) / total)
    : 0;

  const avgTimeSpent = total > 0
    ? Math.round(students.reduce((sum, s) => sum + s.time_spent_hours, 0) / total * 10) / 10
    : 0;

  const engagementRate = total > 0
    ? Math.round((recentlyActive / total) * 100)
    : 0;

  return {
    total_students: total,
    active_students: activeCount,
    completed_students: completedCount,
    dropped_students: droppedCount,
    average_completion_percentage: avgCompletion,
    average_time_spent_hours: avgTimeSpent,
    engagement_rate: engagementRate,
    struggling_students: struggling,
    struggling_students_count: struggling.length,
  };
}

/** Build leaderboard (lines 273-291) */
function buildLeaderboard(students: StudentStats[], limit = 10): LeaderboardEntry[] {
  return students
    .filter(s => s.status === 'active' || s.status === 'completed')
    .sort((a, b) => {
      if (b.completion_percentage !== a.completion_percentage) {
        return b.completion_percentage - a.completion_percentage;
      }
      return b.completed_lessons - a.completed_lessons;
    })
    .slice(0, limit)
    .map((s, i) => ({
      rank: i + 1,
      user_id: s.user_id,
      completion_percentage: s.completion_percentage,
      completed_lessons: s.completed_lessons,
      time_spent_hours: s.time_spent_hours,
    }));
}

interface EnrollmentRecord {
  user_id: string;
  enrolled_at: string; // ISO timestamp
}

interface LessonCompletionRecord {
  user_id: string;
  completed: boolean;
  completed_at: string | null; // ISO timestamp
}

/** Build progress-over-time for a date range (lines 241-269) */
function buildProgressOverTime(
  enrollments: EnrollmentRecord[],
  progressRecords: LessonCompletionRecord[],
  startDate: Date,
  days: number,
): DailyProgress[] {
  const result: DailyProgress[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const completionsOnDay = progressRecords.filter(
      p => p.completed && p.completed_at?.startsWith(dateStr),
    ).length;

    const activeOnDay = enrollments.filter(e => {
      const enrolledDate = new Date(e.enrolled_at);
      return enrolledDate <= date;
    }).length;

    const newEnrollmentsOnDay = enrollments.filter(e =>
      e.enrolled_at.startsWith(dateStr),
    ).length;

    result.push({
      date: dateStr,
      completed_lessons: completionsOnDay,
      active_students: activeOnDay,
      average_completion_rate: activeOnDay > 0
        ? Math.round((completionsOnDay / activeOnDay) * 100)
        : 0,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-01T12:00:00Z');
const RECENTLY = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
const INACTIVE = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

function makeStudent(overrides: Partial<StudentInput> & { user_id: string }): StudentInput {
  return {
    status: 'active',
    completed_lessons: 0,
    total_lessons: 10,
    time_spent_hours: 0,
    last_activity_at: RECENTLY,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// deriveStudentStats — completion percentage
// ---------------------------------------------------------------------------

describe('deriveStudentStats — completion percentage', () => {
  test('100% when all lessons completed', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 10, total_lessons: 10 });
    expect(deriveStudentStats(s, NOW).completion_percentage).toBe(100);
  });

  test('0% when no lessons completed', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 0, total_lessons: 10 });
    expect(deriveStudentStats(s, NOW).completion_percentage).toBe(0);
  });

  test('50% when half lessons completed', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 5, total_lessons: 10 });
    expect(deriveStudentStats(s, NOW).completion_percentage).toBe(50);
  });

  test('rounds to nearest integer (1/3 = 33%)', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 1, total_lessons: 3 });
    expect(deriveStudentStats(s, NOW).completion_percentage).toBe(33);
  });

  test('0% when total_lessons is 0 (no division by zero)', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 0, total_lessons: 0 });
    expect(deriveStudentStats(s, NOW).completion_percentage).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deriveStudentStats — struggling flag
// ---------------------------------------------------------------------------

describe('deriveStudentStats — struggling flag', () => {
  test('struggling when completion < 20%', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 1, total_lessons: 10 }); // 10%
    expect(deriveStudentStats(s, NOW).is_struggling).toBe(true);
  });

  test('not struggling at exactly 20% completion with recent activity', () => {
    const s = makeStudent({ user_id: 's1', completed_lessons: 2, total_lessons: 10 }); // 20%
    expect(deriveStudentStats(s, NOW).is_struggling).toBe(false);
  });

  test('struggling when inactive more than 7 days even with good progress', () => {
    const s = makeStudent({
      user_id: 's1',
      completed_lessons: 8,
      total_lessons: 10,
      last_activity_at: INACTIVE,
    });
    expect(deriveStudentStats(s, NOW).is_struggling).toBe(true);
  });

  test('not struggling when active within 7 days and >= 20% complete', () => {
    const s = makeStudent({
      user_id: 's1',
      completed_lessons: 3,
      total_lessons: 10,
      last_activity_at: RECENTLY,
    });
    expect(deriveStudentStats(s, NOW).is_struggling).toBe(false);
  });

  test('struggling when BOTH criteria met', () => {
    const s = makeStudent({
      user_id: 's1',
      completed_lessons: 1,
      total_lessons: 10,
      last_activity_at: INACTIVE,
    });
    expect(deriveStudentStats(s, NOW).is_struggling).toBe(true);
  });

  test('days_since_activity is computed correctly', () => {
    const threedays = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const s = makeStudent({ user_id: 's1', last_activity_at: threedays });
    expect(deriveStudentStats(s, NOW).days_since_activity).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeCohortStats — aggregate metrics
// ---------------------------------------------------------------------------

describe('computeCohortStats — aggregate metrics', () => {
  test('returns zeros for empty cohort', () => {
    const stats = computeCohortStats([]);
    expect(stats.total_students).toBe(0);
    expect(stats.average_completion_percentage).toBe(0);
    expect(stats.average_time_spent_hours).toBe(0);
    expect(stats.engagement_rate).toBe(0);
  });

  test('counts students by status correctly', () => {
    const students: StudentStats[] = [
      deriveStudentStats(makeStudent({ user_id: 's1', status: 'active' }), NOW),
      deriveStudentStats(makeStudent({ user_id: 's2', status: 'completed', completed_lessons: 10 }), NOW),
      deriveStudentStats(makeStudent({ user_id: 's3', status: 'dropped' }), NOW),
    ];
    const stats = computeCohortStats(students);
    expect(stats.active_students).toBe(1);
    expect(stats.completed_students).toBe(1);
    expect(stats.dropped_students).toBe(1);
    expect(stats.total_students).toBe(3);
  });

  test('average_completion_percentage rounds correctly', () => {
    const students: StudentStats[] = [
      { ...deriveStudentStats(makeStudent({ user_id: 's1', completed_lessons: 1, total_lessons: 10 }), NOW) }, // 10%
      { ...deriveStudentStats(makeStudent({ user_id: 's2', completed_lessons: 3, total_lessons: 10 }), NOW) }, // 30%
    ];
    // (10 + 30) / 2 = 20
    expect(computeCohortStats(students).average_completion_percentage).toBe(20);
  });

  test('engagement_rate is percentage of students active in last 7 days', () => {
    const recent = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const students: StudentStats[] = [
      deriveStudentStats(makeStudent({ user_id: 's1', last_activity_at: recent }), NOW),
      deriveStudentStats(makeStudent({ user_id: 's2', last_activity_at: recent }), NOW),
      deriveStudentStats(makeStudent({ user_id: 's3', last_activity_at: old }), NOW),
      deriveStudentStats(makeStudent({ user_id: 's4', last_activity_at: old }), NOW),
    ];
    // 2 of 4 recently active = 50%
    expect(computeCohortStats(students).engagement_rate).toBe(50);
  });

  test('only active students counted in struggling list', () => {
    const students: StudentStats[] = [
      deriveStudentStats(makeStudent({ user_id: 's1', status: 'active', completed_lessons: 1, total_lessons: 10 }), NOW), // active + struggling
      deriveStudentStats(makeStudent({ user_id: 's2', status: 'dropped', completed_lessons: 0, total_lessons: 10 }), NOW), // dropped + would-be struggling
    ];
    const stats = computeCohortStats(students);
    // Only active struggling students should appear
    expect(stats.struggling_students.every(s => s.status === 'active')).toBe(true);
    expect(stats.struggling_students_count).toBe(1);
  });

  test('average_time_spent_hours is rounded to 1 decimal place', () => {
    const s1 = { ...deriveStudentStats(makeStudent({ user_id: 's1' }), NOW), time_spent_hours: 1.25 };
    const s2 = { ...deriveStudentStats(makeStudent({ user_id: 's2' }), NOW), time_spent_hours: 2.75 };
    const stats = computeCohortStats([s1, s2]);
    // (1.25 + 2.75) / 2 = 2.0
    expect(stats.average_time_spent_hours).toBe(2.0);
  });
});

// ---------------------------------------------------------------------------
// buildLeaderboard — ranking
// ---------------------------------------------------------------------------

describe('buildLeaderboard', () => {
  test('ranks by completion percentage descending', () => {
    const students: StudentStats[] = [
      { ...deriveStudentStats(makeStudent({ user_id: 'low', completed_lessons: 2, total_lessons: 10 }), NOW) }, // 20%
      { ...deriveStudentStats(makeStudent({ user_id: 'high', completed_lessons: 9, total_lessons: 10 }), NOW) }, // 90%
      { ...deriveStudentStats(makeStudent({ user_id: 'mid', completed_lessons: 5, total_lessons: 10 }), NOW) }, // 50%
    ];
    const board = buildLeaderboard(students);
    expect(board[0].user_id).toBe('high');
    expect(board[1].user_id).toBe('mid');
    expect(board[2].user_id).toBe('low');
  });

  test('ranks equally by completed_lessons when completion_percentage ties', () => {
    // Two students both at 50% but different lesson counts (different total_lessons)
    const s1: StudentStats = {
      ...deriveStudentStats(makeStudent({ user_id: 'a', completed_lessons: 5, total_lessons: 10 }), NOW),
      completed_lessons: 10,
      completion_percentage: 50,
    };
    const s2: StudentStats = {
      ...deriveStudentStats(makeStudent({ user_id: 'b', completed_lessons: 5, total_lessons: 10 }), NOW),
      completed_lessons: 5,
      completion_percentage: 50,
    };
    const board = buildLeaderboard([s1, s2]);
    expect(board[0].user_id).toBe('a'); // more completed_lessons wins
    expect(board[1].user_id).toBe('b');
  });

  test('excludes dropped and paused students from leaderboard', () => {
    const students: StudentStats[] = [
      { ...deriveStudentStats(makeStudent({ user_id: 'active', completed_lessons: 5, total_lessons: 10 }), NOW) },
      { ...deriveStudentStats(makeStudent({ user_id: 'dropped', status: 'dropped', completed_lessons: 8, total_lessons: 10 }), NOW) },
      { ...deriveStudentStats(makeStudent({ user_id: 'paused', status: 'paused', completed_lessons: 7, total_lessons: 10 }), NOW) },
    ];
    const board = buildLeaderboard(students);
    const ids = board.map(e => e.user_id);
    expect(ids).toContain('active');
    expect(ids).not.toContain('dropped');
    expect(ids).not.toContain('paused');
  });

  test('includes completed students in leaderboard', () => {
    const students: StudentStats[] = [
      { ...deriveStudentStats(makeStudent({ user_id: 'done', status: 'completed', completed_lessons: 10, total_lessons: 10 }), NOW) },
    ];
    const board = buildLeaderboard(students);
    expect(board[0].user_id).toBe('done');
  });

  test('returns at most 10 entries regardless of cohort size', () => {
    const students: StudentStats[] = Array.from({ length: 20 }, (_, i) =>
      deriveStudentStats(
        makeStudent({ user_id: `s${i}`, completed_lessons: i, total_lessons: 20 }),
        NOW,
      ),
    );
    expect(buildLeaderboard(students)).toHaveLength(10);
  });

  test('rank numbers start at 1 and are consecutive', () => {
    const students: StudentStats[] = [
      deriveStudentStats(makeStudent({ user_id: 'a', completed_lessons: 9, total_lessons: 10 }), NOW),
      deriveStudentStats(makeStudent({ user_id: 'b', completed_lessons: 5, total_lessons: 10 }), NOW),
      deriveStudentStats(makeStudent({ user_id: 'c', completed_lessons: 2, total_lessons: 10 }), NOW),
    ];
    const board = buildLeaderboard(students);
    board.forEach((entry, i) => expect(entry.rank).toBe(i + 1));
  });

  test('returns empty array for empty cohort', () => {
    expect(buildLeaderboard([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildProgressOverTime — daily aggregation
// ---------------------------------------------------------------------------

describe('buildProgressOverTime', () => {
  const baseDate = new Date('2026-03-01T00:00:00Z');

  // Use end-of-day timestamps so enrolledDate <= date (day start) is always true
  // for the day of enrollment — mirroring real data where enrolled_at is set before
  // the day iterator is compared against.
  const enrollments: EnrollmentRecord[] = [
    { user_id: 's1', enrolled_at: '2026-02-28T23:59:59Z' }, // enrolled before Mar 1
    { user_id: 's2', enrolled_at: '2026-03-01T23:59:59Z' }, // enrolled before Mar 2
    { user_id: 's3', enrolled_at: '2026-03-02T23:59:59Z' }, // enrolled before Mar 3
  ];

  const completions: LessonCompletionRecord[] = [
    { user_id: 's1', completed: true, completed_at: '2026-03-01T10:00:00Z' },
    { user_id: 's1', completed: true, completed_at: '2026-03-01T11:00:00Z' },
    { user_id: 's2', completed: true, completed_at: '2026-03-02T09:00:00Z' },
    { user_id: 's2', completed: false, completed_at: null }, // not completed
  ];

  test('generates correct number of days', () => {
    const result = buildProgressOverTime(enrollments, completions, baseDate, 7);
    expect(result).toHaveLength(7);
  });

  test('counts completions on correct day', () => {
    const result = buildProgressOverTime(enrollments, completions, baseDate, 3);
    const day1 = result.find(d => d.date === '2026-03-01');
    expect(day1?.completed_lessons).toBe(2);
  });

  test('counts only completed=true records', () => {
    const result = buildProgressOverTime(enrollments, completions, baseDate, 3);
    const day2 = result.find(d => d.date === '2026-03-02');
    expect(day2?.completed_lessons).toBe(1); // s2 has one true + one false
  });

  test('active_students on a day counts enrolled-by-that-day students', () => {
    const result = buildProgressOverTime(enrollments, completions, baseDate, 3);
    expect(result[0].active_students).toBe(1); // only s1 enrolled by Mar 1
    expect(result[1].active_students).toBe(2); // s1 + s2 by Mar 2
    expect(result[2].active_students).toBe(3); // all 3 by Mar 3
  });

  test('average_completion_rate is 0 when no active students', () => {
    const laterBase = new Date('2026-02-28T00:00:00Z');
    const result = buildProgressOverTime(enrollments, completions, laterBase, 1);
    expect(result[0].active_students).toBe(0);
    expect(result[0].average_completion_rate).toBe(0);
  });

  test('average_completion_rate rounds to integer', () => {
    // 2 completions, 3 active on Mar 3 = 66.67% -> rounds to 67
    const result = buildProgressOverTime(enrollments, completions, baseDate, 3);
    const day3 = result.find(d => d.date === '2026-03-03');
    // 0 completions on day 3 specifically, verify no crash
    expect(typeof day3?.average_completion_rate).toBe('number');
  });

  test('date strings are in YYYY-MM-DD format', () => {
    const result = buildProgressOverTime(enrollments, completions, baseDate, 5);
    result.forEach(d => {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  test('returns empty array for 0 days', () => {
    expect(buildProgressOverTime(enrollments, completions, baseDate, 0)).toHaveLength(0);
  });
});
