/**
 * Certificate Eligibility Unit Tests
 *
 * Certificates are issued when a student completes a course
 * (enrollment.status === 'completed', progress_percentage === 100) and all
 * required quizzes are passed.  This module tests the pure eligibility
 * decision — no database calls, no Supabase required.
 *
 * Domain rules under test:
 *  1. Enrollment must be 'completed' to be certificate-eligible.
 *  2. progress_percentage must reach 100 (all lessons done).
 *  3. All required quizzes must have a passing attempt.
 *  4. 'dropped' or 'paused' enrollment is never eligible.
 *  5. A certificate object must carry required identifying fields
 *     (certificate_code, student_name, course_title, issued_date).
 *  6. final_grade reflects the achieved score string (optional but validated
 *     when present).
 */

import { describe, test, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure-logic helpers extracted from domain rules in schema.sql and types
// ---------------------------------------------------------------------------

type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'paused';

interface EnrollmentSnapshot {
  status: EnrollmentStatus;
  progress_percentage: number;
  completed_at: string | null;
}

interface QuizAttemptSummary {
  quiz_id: string;
  passed: boolean;
  score: number;
}

interface CertificateCandidate {
  certificate_code: string;
  student_name: string;
  course_title: string;
  issued_date: string;
  final_grade?: string | null;
  expiry_date?: string | null;
}

/**
 * Determine whether a student is eligible for a certificate.
 *
 * Mirrors the logic in:
 *  - schema.sql: is_course_completed function (status = 'completed')
 *  - cohort_enrollments.progress_percentage CHECK (0 <= x <= 100)
 *  - quiz_attempts.passed boolean
 */
function isCertificateEligible(
  enrollment: EnrollmentSnapshot,
  quizAttempts: QuizAttemptSummary[],
  requiredQuizIds: string[],
): boolean {
  if (enrollment.status !== 'completed') return false;
  if (enrollment.progress_percentage < 100) return false;
  if (enrollment.completed_at === null) return false;

  // All required quizzes must have at least one passing attempt
  for (const quizId of requiredQuizIds) {
    const hasPassed = quizAttempts.some(a => a.quiz_id === quizId && a.passed);
    if (!hasPassed) return false;
  }

  return true;
}

/**
 * Validate a certificate object has all required fields per schema.sql.
 */
function validateCertificateFields(cert: Partial<CertificateCandidate>): string[] {
  const errors: string[] = [];
  if (!cert.certificate_code?.trim()) errors.push('certificate_code is required');
  if (!cert.student_name?.trim()) errors.push('student_name is required');
  if (!cert.course_title?.trim()) errors.push('course_title is required');
  if (!cert.issued_date?.trim()) errors.push('issued_date is required');
  return errors;
}

/**
 * Calculate a letter-grade string from a numeric score (0-100).
 * Used to populate certificates.final_grade.
 */
function calculateFinalGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEnrollment(overrides: Partial<EnrollmentSnapshot> = {}): EnrollmentSnapshot {
  return {
    status: 'completed',
    progress_percentage: 100,
    completed_at: '2026-04-01T10:00:00Z',
    ...overrides,
  };
}

function makeAttempts(overrides: Partial<QuizAttemptSummary>[] = []): QuizAttemptSummary[] {
  return overrides.map((o, i) => ({
    quiz_id: `quiz-${i + 1}`,
    passed: true,
    score: 80,
    ...o,
  }));
}

// ---------------------------------------------------------------------------
// isCertificateEligible — enrollment status rules
// ---------------------------------------------------------------------------

describe('isCertificateEligible — enrollment status', () => {
  test('eligible when enrollment is completed with full progress', () => {
    expect(isCertificateEligible(makeEnrollment(), [], [])).toBe(true);
  });

  test('not eligible when status is active', () => {
    expect(isCertificateEligible(makeEnrollment({ status: 'active' }), [], [])).toBe(false);
  });

  test('not eligible when status is dropped', () => {
    expect(isCertificateEligible(makeEnrollment({ status: 'dropped' }), [], [])).toBe(false);
  });

  test('not eligible when status is paused', () => {
    expect(isCertificateEligible(makeEnrollment({ status: 'paused' }), [], [])).toBe(false);
  });

  test('not eligible when completed_at is null even if status is completed', () => {
    const enrollment = makeEnrollment({ completed_at: null });
    expect(isCertificateEligible(enrollment, [], [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCertificateEligible — progress_percentage rules
// ---------------------------------------------------------------------------

describe('isCertificateEligible — progress threshold', () => {
  test('eligible when progress_percentage is exactly 100', () => {
    expect(isCertificateEligible(makeEnrollment({ progress_percentage: 100 }), [], [])).toBe(true);
  });

  test('not eligible when progress_percentage is 99', () => {
    expect(isCertificateEligible(makeEnrollment({ progress_percentage: 99 }), [], [])).toBe(false);
  });

  test('not eligible when progress_percentage is 0', () => {
    expect(isCertificateEligible(makeEnrollment({ progress_percentage: 0 }), [], [])).toBe(false);
  });

  test('not eligible when progress_percentage is 50 (halfway)', () => {
    expect(isCertificateEligible(makeEnrollment({ progress_percentage: 50 }), [], [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCertificateEligible — required quiz rules
// ---------------------------------------------------------------------------

describe('isCertificateEligible — required quiz passing', () => {
  test('eligible when no quizzes are required', () => {
    expect(isCertificateEligible(makeEnrollment(), [], [])).toBe(true);
  });

  test('eligible when all required quizzes have a passing attempt', () => {
    const attempts = makeAttempts([
      { quiz_id: 'quiz-1', passed: true, score: 85 },
      { quiz_id: 'quiz-2', passed: true, score: 90 },
    ]);
    expect(isCertificateEligible(makeEnrollment(), attempts, ['quiz-1', 'quiz-2'])).toBe(true);
  });

  test('not eligible when one required quiz has no passing attempt', () => {
    const attempts = makeAttempts([
      { quiz_id: 'quiz-1', passed: true, score: 85 },
      { quiz_id: 'quiz-2', passed: false, score: 60 },
    ]);
    expect(isCertificateEligible(makeEnrollment(), attempts, ['quiz-1', 'quiz-2'])).toBe(false);
  });

  test('not eligible when a required quiz has no attempt at all', () => {
    const attempts = makeAttempts([{ quiz_id: 'quiz-1', passed: true, score: 85 }]);
    expect(isCertificateEligible(makeEnrollment(), attempts, ['quiz-1', 'quiz-missing'])).toBe(false);
  });

  test('eligible when student has failed attempts but also a passing one', () => {
    const attempts: QuizAttemptSummary[] = [
      { quiz_id: 'quiz-1', passed: false, score: 60 },
      { quiz_id: 'quiz-1', passed: true, score: 75 },  // second attempt passed
    ];
    expect(isCertificateEligible(makeEnrollment(), attempts, ['quiz-1'])).toBe(true);
  });

  test('non-required quizzes do not block eligibility even when failed', () => {
    const attempts = makeAttempts([
      { quiz_id: 'quiz-optional', passed: false, score: 40 },
    ]);
    // Only quiz-required is in requiredQuizIds, quiz-optional is not
    expect(isCertificateEligible(makeEnrollment(), attempts, [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateCertificateFields — schema field requirements
// ---------------------------------------------------------------------------

describe('validateCertificateFields', () => {
  const validCert: CertificateCandidate = {
    certificate_code: 'CERT-2026-000042',
    student_name: 'Aroha Ngata',
    course_title: 'Animal Advocacy Fundamentals',
    issued_date: '2026-04-01',
  };

  test('passes with all required fields present', () => {
    expect(validateCertificateFields(validCert)).toHaveLength(0);
  });

  test('fails when certificate_code is missing', () => {
    const errors = validateCertificateFields({ ...validCert, certificate_code: '' });
    expect(errors).toContain('certificate_code is required');
  });

  test('fails when student_name is missing', () => {
    const errors = validateCertificateFields({ ...validCert, student_name: '' });
    expect(errors).toContain('student_name is required');
  });

  test('fails when student_name is only whitespace', () => {
    const errors = validateCertificateFields({ ...validCert, student_name: '   ' });
    expect(errors).toContain('student_name is required');
  });

  test('fails when course_title is missing', () => {
    const errors = validateCertificateFields({ ...validCert, course_title: '' });
    expect(errors).toContain('course_title is required');
  });

  test('fails when issued_date is missing', () => {
    const errors = validateCertificateFields({ ...validCert, issued_date: '' });
    expect(errors).toContain('issued_date is required');
  });

  test('accumulates multiple missing-field errors', () => {
    const errors = validateCertificateFields({});
    expect(errors.length).toBe(4);
  });

  test('optional fields do not cause errors when absent', () => {
    const { final_grade: _fg, expiry_date: _ed, ...required } = validCert as CertificateCandidate & { final_grade?: string; expiry_date?: string };
    expect(validateCertificateFields(required)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// calculateFinalGrade
// ---------------------------------------------------------------------------

describe('calculateFinalGrade', () => {
  test('returns A for score >= 90', () => {
    expect(calculateFinalGrade(90)).toBe('A');
    expect(calculateFinalGrade(100)).toBe('A');
    expect(calculateFinalGrade(95)).toBe('A');
  });

  test('returns B for score in 80-89 range', () => {
    expect(calculateFinalGrade(80)).toBe('B');
    expect(calculateFinalGrade(89)).toBe('B');
  });

  test('returns C for score in 70-79 range (passing threshold)', () => {
    expect(calculateFinalGrade(70)).toBe('C');
    expect(calculateFinalGrade(79)).toBe('C');
  });

  test('returns D for score in 60-69 range', () => {
    expect(calculateFinalGrade(60)).toBe('D');
    expect(calculateFinalGrade(69)).toBe('D');
  });

  test('returns F for score below 60', () => {
    expect(calculateFinalGrade(59)).toBe('F');
    expect(calculateFinalGrade(0)).toBe('F');
  });

  test('boundary: 89 is B not A', () => {
    expect(calculateFinalGrade(89)).toBe('B');
  });

  test('boundary: 70 is C not D', () => {
    expect(calculateFinalGrade(70)).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// Combined eligibility + grade scenarios
// ---------------------------------------------------------------------------

describe('certificate eligibility — realistic cohort scenarios', () => {
  test('student completing all lessons and passing all quizzes gets certificate', () => {
    const enrollment = makeEnrollment();
    const attempts = makeAttempts([
      { quiz_id: 'q-intro', passed: true, score: 88 },
      { quiz_id: 'q-advanced', passed: true, score: 92 },
    ]);
    const eligible = isCertificateEligible(enrollment, attempts, ['q-intro', 'q-advanced']);
    expect(eligible).toBe(true);
    expect(calculateFinalGrade(90)).toBe('A');
  });

  test('student who dropped midway does not get certificate', () => {
    const enrollment = makeEnrollment({ status: 'dropped', progress_percentage: 80 });
    const attempts = makeAttempts([{ quiz_id: 'q-intro', passed: true, score: 85 }]);
    expect(isCertificateEligible(enrollment, attempts, ['q-intro'])).toBe(false);
  });

  test('active student at 100% completion is not yet eligible', () => {
    // Status must be 'completed' — the system marks it, not the percentage alone
    const enrollment = makeEnrollment({ status: 'active', progress_percentage: 100 });
    expect(isCertificateEligible(enrollment, [], [])).toBe(false);
  });

  test('completed student who never sat a required quiz is not eligible', () => {
    const enrollment = makeEnrollment();
    expect(isCertificateEligible(enrollment, [], ['quiz-required'])).toBe(false);
  });

  test('completed student with 99% progress is not eligible', () => {
    const enrollment = makeEnrollment({ progress_percentage: 99 });
    const attempts = makeAttempts([{ quiz_id: 'q-1', passed: true, score: 80 }]);
    expect(isCertificateEligible(enrollment, attempts, ['q-1'])).toBe(false);
  });
});
