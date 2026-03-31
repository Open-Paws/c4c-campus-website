/**
 * Quiz Grading Unit Tests
 *
 * Covers: validateQuiz, checkQuizAvailability, autoGradeQuizAttempt,
 *         isAttemptExpired, getRemainingTime, shuffleQuestions
 *
 * Design rule: every test must fail when the behaviour it covers breaks.
 * No coverage theatre — assertion quality over percentage.
 *
 * All tests are pure-logic: no database, no Supabase, no network.
 * Fixtures use realistic advocacy-domain content (campaigns, investigations,
 * factory farms, sanctuaries) consistent with the Open Paws ubiquitous language.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateQuiz,
  checkQuizAvailability,
  autoGradeQuizAttempt,
  isAttemptExpired,
  getRemainingTime,
  shuffleQuestions,
} from '@/lib/quiz-grading';
import type { Quiz, Question, QuizAttempt } from '@/lib/quiz-grading';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 'quiz-uuid-001',
    title: 'Animal Advocacy Fundamentals',
    passing_score: 70,
    max_attempts: 3,
    is_published: true,
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<QuizAttempt> = {}): QuizAttempt {
  return {
    id: 'attempt-uuid-001',
    started_at: new Date().toISOString(),
    ...overrides,
  };
}

const mcQuestion: Question = {
  id: 'q1',
  question_type: 'multiple_choice',
  question_text: 'Which system causes the most farmed animal suffering?',
  points: 10,
  options: [
    { id: 'a', text: 'Factory farming', is_correct: true },
    { id: 'b', text: 'Sanctuaries', is_correct: false },
    { id: 'c', text: 'Rescue organisations', is_correct: false },
  ],
};

const tfQuestion: Question = {
  id: 'q2',
  question_type: 'true_false',
  question_text: 'Ag-gag laws restrict investigation of factory farms.',
  points: 5,
  correct_answer: true,
};

const msQuestion: Question = {
  id: 'q3',
  question_type: 'multiple_select',
  question_text: 'Which of these are farmed animal species?',
  points: 10,
  options: [
    { id: 'pig', text: 'Pigs', is_correct: true },
    { id: 'cow', text: 'Cows', is_correct: true },
    { id: 'dog', text: 'Dogs', is_correct: false },
  ],
};

const saQuestion: Question = {
  id: 'q4',
  question_type: 'short_answer',
  question_text: 'Name the practice of covert documentation of exploitation.',
  points: 5,
  correct_answer: 'investigation',
  correct_answers: ['investigation', 'undercover investigation'],
};

const essayQuestion: Question = {
  id: 'q5',
  question_type: 'essay',
  question_text: 'Describe the economic impact of campaign work.',
  points: 20,
};

// ---------------------------------------------------------------------------
// validateQuiz
// ---------------------------------------------------------------------------

describe('validateQuiz', () => {
  test('passes with all required fields provided', () => {
    const result = validateQuiz(makeQuiz());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('fails when title is missing', () => {
    const result = validateQuiz(makeQuiz({ title: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Quiz title is required');
  });

  test('fails when title is only whitespace', () => {
    const result = validateQuiz(makeQuiz({ title: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('title'))).toBe(true);
  });

  test('fails when passing_score exceeds 100', () => {
    const result = validateQuiz(makeQuiz({ passing_score: 101 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Passing score'))).toBe(true);
  });

  test('fails when passing_score is negative', () => {
    const result = validateQuiz(makeQuiz({ passing_score: -1 }));
    expect(result.valid).toBe(false);
  });

  test('passes when passing_score is exactly 0', () => {
    const result = validateQuiz(makeQuiz({ passing_score: 0 }));
    expect(result.valid).toBe(true);
  });

  test('passes when passing_score is exactly 100', () => {
    const result = validateQuiz(makeQuiz({ passing_score: 100 }));
    expect(result.valid).toBe(true);
  });

  test('fails when time_limit_minutes is negative', () => {
    const result = validateQuiz(makeQuiz({ time_limit_minutes: -5 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Time limit'))).toBe(true);
  });

  test('passes when time_limit_minutes is 0 (unlimited)', () => {
    const result = validateQuiz(makeQuiz({ time_limit_minutes: 0 }));
    expect(result.valid).toBe(true);
  });

  test('fails when max_attempts is negative', () => {
    const result = validateQuiz(makeQuiz({ max_attempts: -1 }));
    expect(result.valid).toBe(false);
  });

  test('passes when max_attempts is 0 (unlimited)', () => {
    const result = validateQuiz(makeQuiz({ max_attempts: 0 }));
    expect(result.valid).toBe(true);
  });

  test('fails when available_until is before available_from', () => {
    const result = validateQuiz(makeQuiz({
      available_from: '2026-06-01',
      available_until: '2026-05-01',
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Available until'))).toBe(true);
  });

  test('fails when available_until equals available_from', () => {
    const result = validateQuiz(makeQuiz({
      available_from: '2026-06-01T12:00:00Z',
      available_until: '2026-06-01T12:00:00Z',
    }));
    expect(result.valid).toBe(false);
  });

  test('passes when available_until is after available_from', () => {
    const result = validateQuiz(makeQuiz({
      available_from: '2026-05-01',
      available_until: '2026-06-01',
    }));
    expect(result.valid).toBe(true);
  });

  test('accumulates multiple validation errors', () => {
    const result = validateQuiz({ title: '', passing_score: 150, max_attempts: -2 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// checkQuizAvailability
// ---------------------------------------------------------------------------

describe('checkQuizAvailability', () => {
  test('denies access to unpublished quiz', () => {
    const quiz = makeQuiz({ is_published: false });
    const result = checkQuizAvailability(quiz, 0);
    expect(result.canAttempt).toBe(false);
    expect(result.reasonCode).toBe('not_published');
  });

  test('denies when student has reached max attempts', () => {
    const quiz = makeQuiz({ max_attempts: 3 });
    const result = checkQuizAvailability(quiz, 3);
    expect(result.canAttempt).toBe(false);
    expect(result.reasonCode).toBe('max_attempts_reached');
    expect(result.attemptsRemaining).toBe(0);
  });

  test('allows when max_attempts is 0 (unlimited) regardless of attempt count', () => {
    const quiz = makeQuiz({ max_attempts: 0 });
    const result = checkQuizAvailability(quiz, 999);
    expect(result.canAttempt).toBe(true);
    expect(result.attemptsRemaining).toBeNull();
  });

  test('denies when quiz has not yet opened', () => {
    const future = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const quiz = makeQuiz({ available_from: future });
    const result = checkQuizAvailability(quiz, 0);
    expect(result.canAttempt).toBe(false);
    expect(result.reasonCode).toBe('not_yet_available');
  });

  test('denies when quiz deadline has passed', () => {
    const past = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const quiz = makeQuiz({ available_until: past });
    const result = checkQuizAvailability(quiz, 0);
    expect(result.canAttempt).toBe(false);
    expect(result.reasonCode).toBe('deadline_passed');
  });

  test('allows when within availability window', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    const quiz = makeQuiz({ available_from: past, available_until: future });
    const result = checkQuizAvailability(quiz, 1);
    expect(result.canAttempt).toBe(true);
  });

  test('reports correct attemptsRemaining', () => {
    const quiz = makeQuiz({ max_attempts: 5 });
    const result = checkQuizAvailability(quiz, 2);
    expect(result.attemptsRemaining).toBe(3);
  });

  test('attemptsRemaining cannot go below zero', () => {
    const quiz = makeQuiz({ max_attempts: 2 });
    const result = checkQuizAvailability(quiz, 5); // over the limit
    // Will return max_attempts_reached — attemptsRemaining is 0, not negative
    expect(result.attemptsRemaining).toBe(0);
  });

  test('not_published takes precedence over not_yet_available', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const quiz = makeQuiz({ is_published: false, available_from: future });
    const result = checkQuizAvailability(quiz, 0);
    expect(result.reasonCode).toBe('not_published');
  });
});

// ---------------------------------------------------------------------------
// autoGradeQuizAttempt — multiple_choice
// ---------------------------------------------------------------------------

describe('autoGradeQuizAttempt — multiple_choice', () => {
  const quiz = makeQuiz({ passing_score: 70 });

  test('awards full points for correct option id', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'a' }],
      quiz,
    );
    expect(result.pointsEarned).toBe(10);
    expect(result.answers[0].is_correct).toBe(true);
  });

  test('awards zero points for wrong option id', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'b' }],
      quiz,
    );
    expect(result.pointsEarned).toBe(0);
    expect(result.answers[0].is_correct).toBe(false);
  });

  test('awards zero points when no answer provided', () => {
    const result = autoGradeQuizAttempt([mcQuestion], [], quiz);
    expect(result.pointsEarned).toBe(0);
    expect(result.answers[0].is_correct).toBe(false);
  });

  test('calculates score as percentage of total points', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'a' }],
      quiz,
    );
    expect(result.score).toBe(100);
    expect(result.totalPoints).toBe(10);
  });

  test('marks as passed when score meets passing threshold', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'a' }],
      makeQuiz({ passing_score: 70 }),
    );
    expect(result.passed).toBe(true);
  });

  test('marks as failed when score is below passing threshold', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'b' }],
      makeQuiz({ passing_score: 70 }),
    );
    expect(result.passed).toBe(false);
  });

  test('accepts record format answers as well as array format', () => {
    const result = autoGradeQuizAttempt([mcQuestion], { q1: 'a' }, quiz);
    expect(result.pointsEarned).toBe(10);
    expect(result.answers[0].is_correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// autoGradeQuizAttempt — true_false
// ---------------------------------------------------------------------------

describe('autoGradeQuizAttempt — true_false', () => {
  const quiz = makeQuiz({ passing_score: 50 });

  test('awards points when student answers true and correct is true', () => {
    const result = autoGradeQuizAttempt(
      [tfQuestion],
      [{ questionId: 'q2', answer: 'true' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(true);
  });

  test('awards points when student sends boolean true', () => {
    const result = autoGradeQuizAttempt([tfQuestion], { q2: true }, quiz);
    expect(result.answers[0].is_correct).toBe(true);
  });

  test('deducts when student answers false for a true question', () => {
    const result = autoGradeQuizAttempt(
      [tfQuestion],
      [{ questionId: 'q2', answer: 'false' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });

  test('handles false correct_answer correctly', () => {
    const falseTf: Question = { ...tfQuestion, id: 'q2b', correct_answer: false };
    const result = autoGradeQuizAttempt(
      [falseTf],
      [{ questionId: 'q2b', answer: 'false' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// autoGradeQuizAttempt — multiple_select
// ---------------------------------------------------------------------------

describe('autoGradeQuizAttempt — multiple_select', () => {
  const quiz = makeQuiz({ passing_score: 70 });

  test('awards points when all correct options selected in any order', () => {
    const result = autoGradeQuizAttempt(
      [msQuestion],
      [{ questionId: 'q3', answer: ['cow', 'pig'] }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(true);
    expect(result.pointsEarned).toBe(10);
  });

  test('denies points when selection includes an incorrect option', () => {
    const result = autoGradeQuizAttempt(
      [msQuestion],
      [{ questionId: 'q3', answer: ['pig', 'cow', 'dog'] }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(false);
  });

  test('denies points for partial correct selection', () => {
    const result = autoGradeQuizAttempt(
      [msQuestion],
      [{ questionId: 'q3', answer: ['pig'] }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(false);
  });

  test('denies points when answer is not an array', () => {
    const result = autoGradeQuizAttempt(
      [msQuestion],
      [{ questionId: 'q3', answer: 'pig' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// autoGradeQuizAttempt — short_answer
// ---------------------------------------------------------------------------

describe('autoGradeQuizAttempt — short_answer', () => {
  const quiz = makeQuiz({ passing_score: 50 });

  test('awards points for exact match (case-insensitive)', () => {
    const result = autoGradeQuizAttempt(
      [saQuestion],
      [{ questionId: 'q4', answer: 'Investigation' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(true);
  });

  test('awards points for alternative correct answer', () => {
    const result = autoGradeQuizAttempt(
      [saQuestion],
      [{ questionId: 'q4', answer: 'undercover investigation' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(true);
  });

  test('trims whitespace before comparing', () => {
    const result = autoGradeQuizAttempt(
      [saQuestion],
      [{ questionId: 'q4', answer: '  investigation  ' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(true);
  });

  test('denies points for wrong answer', () => {
    const result = autoGradeQuizAttempt(
      [saQuestion],
      [{ questionId: 'q4', answer: 'campaign' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBe(false);
  });

  test('falls back to single correct_answer when correct_answers absent', () => {
    const q: Question = {
      ...saQuestion,
      id: 'q4b',
      correct_answer: 'sanctuary',
      correct_answers: undefined,
    };
    const result = autoGradeQuizAttempt([q], [{ questionId: 'q4b', answer: 'Sanctuary' }], quiz);
    expect(result.answers[0].is_correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// autoGradeQuizAttempt — essay
// ---------------------------------------------------------------------------

describe('autoGradeQuizAttempt — essay', () => {
  const quiz = makeQuiz({ passing_score: 50 });

  test('sets is_correct to null for essay (needs manual review)', () => {
    const result = autoGradeQuizAttempt(
      [essayQuestion],
      [{ questionId: 'q5', answer: 'A long thoughtful answer...' }],
      quiz,
    );
    expect(result.answers[0].is_correct).toBeNull();
  });

  test('awards zero auto-points for essay', () => {
    const result = autoGradeQuizAttempt(
      [essayQuestion],
      [{ questionId: 'q5', answer: 'Some response' }],
      quiz,
    );
    expect(result.answers[0].points_earned).toBe(0);
  });

  test('sets gradingStatus to needs_review when essay is present', () => {
    const result = autoGradeQuizAttempt(
      [essayQuestion],
      [{ questionId: 'q5', answer: 'Some response' }],
      quiz,
    );
    expect(result.gradingStatus).toBe('needs_review');
  });

  test('sets gradingStatus to auto_graded when only objective questions present', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'a' }],
      quiz,
    );
    expect(result.gradingStatus).toBe('auto_graded');
  });
});

// ---------------------------------------------------------------------------
// autoGradeQuizAttempt — mixed questions and scoring
// ---------------------------------------------------------------------------

describe('autoGradeQuizAttempt — mixed questions', () => {
  const quiz = makeQuiz({ passing_score: 70 });
  const allQuestions = [mcQuestion, tfQuestion];

  test('totals points across all question types', () => {
    const result = autoGradeQuizAttempt(allQuestions, [], quiz);
    expect(result.totalPoints).toBe(15); // 10 + 5
  });

  test('score is 0 when zero total points (empty question list)', () => {
    const result = autoGradeQuizAttempt([], [], quiz);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('score rounds to nearest integer', () => {
    // 1 out of 3 questions correct: 10/15 = 66.67% -> rounds to 67
    const result = autoGradeQuizAttempt(
      allQuestions,
      [{ questionId: 'q1', answer: 'a' }],  // mc correct, tf missing
      quiz,
    );
    expect(result.score).toBe(67);
  });

  test('feedback field is null by default on all graded answers', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'a' }],
      quiz,
    );
    expect(result.answers[0].feedback).toBeNull();
  });

  test('question_id matches the question id on graded answer', () => {
    const result = autoGradeQuizAttempt(
      [mcQuestion],
      [{ questionId: 'q1', answer: 'a' }],
      quiz,
    );
    expect(result.answers[0].question_id).toBe('q1');
  });
});

// ---------------------------------------------------------------------------
// isAttemptExpired
// ---------------------------------------------------------------------------

describe('isAttemptExpired', () => {
  test('returns false when quiz has no time limit', () => {
    const attempt = makeAttempt({ started_at: new Date(Date.now() - 7200000).toISOString() });
    const quiz = makeQuiz({ time_limit_minutes: 0 });
    expect(isAttemptExpired(attempt, quiz)).toBe(false);
  });

  test('returns false when time limit is undefined', () => {
    const attempt = makeAttempt({ started_at: new Date(Date.now() - 7200000).toISOString() });
    const quiz = makeQuiz({ time_limit_minutes: undefined });
    expect(isAttemptExpired(attempt, quiz)).toBe(false);
  });

  test('returns true when attempt started more than time_limit ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const attempt = makeAttempt({ started_at: twoHoursAgo });
    const quiz = makeQuiz({ time_limit_minutes: 60 }); // 1 hour
    expect(isAttemptExpired(attempt, quiz)).toBe(true);
  });

  test('returns false when started within time limit', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const attempt = makeAttempt({ started_at: tenMinutesAgo });
    const quiz = makeQuiz({ time_limit_minutes: 60 });
    expect(isAttemptExpired(attempt, quiz)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRemainingTime
// ---------------------------------------------------------------------------

describe('getRemainingTime', () => {
  test('returns null when quiz has no time limit', () => {
    const attempt = makeAttempt();
    const quiz = makeQuiz({ time_limit_minutes: 0 });
    expect(getRemainingTime(attempt, quiz)).toBeNull();
  });

  test('returns null when time_limit_minutes is undefined', () => {
    const attempt = makeAttempt();
    const quiz = makeQuiz({ time_limit_minutes: undefined });
    expect(getRemainingTime(attempt, quiz)).toBeNull();
  });

  test('returns positive seconds when time is remaining', () => {
    const recentStart = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    const attempt = makeAttempt({ started_at: recentStart });
    const quiz = makeQuiz({ time_limit_minutes: 60 });
    const remaining = getRemainingTime(attempt, quiz);
    expect(remaining).not.toBeNull();
    expect(remaining!).toBeGreaterThan(0);
    // Should be approximately 55 minutes left
    expect(remaining!).toBeLessThanOrEqual(55 * 60);
    expect(remaining!).toBeGreaterThanOrEqual(54 * 60);
  });

  test('returns 0 (not negative) when time has expired', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const attempt = makeAttempt({ started_at: twoHoursAgo });
    const quiz = makeQuiz({ time_limit_minutes: 60 });
    expect(getRemainingTime(attempt, quiz)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// shuffleQuestions
// ---------------------------------------------------------------------------

describe('shuffleQuestions', () => {
  test('returns array with same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleQuestions([...input]);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('does not mutate original array by default', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    shuffleQuestions(input);
    expect(input).toEqual(original);
  });

  test('mutates original when inPlace is true', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleQuestions(input, true);
    expect(result).toBe(input); // same reference
  });

  test('preserves length', () => {
    const questions = [mcQuestion, tfQuestion, msQuestion];
    expect(shuffleQuestions(questions)).toHaveLength(3);
  });

  test('handles empty array without error', () => {
    expect(() => shuffleQuestions([])).not.toThrow();
    expect(shuffleQuestions([])).toEqual([]);
  });

  test('handles single element array', () => {
    expect(shuffleQuestions([42])).toEqual([42]);
  });
});
