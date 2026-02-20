/**
 * QuizCard Component
 *
 * Displays quiz information in lesson context with start/continue/review options
 */

import { useState, useEffect } from 'react';
import type { QuizWithDetails, QuizAttempt } from '@/types/quiz';

interface QuizCardProps {
  quizId: string; // UUID
  lessonId: string; // UUID
  onStart?: (quizId: string) => void;
}

export function QuizCard({ quizId }: QuizCardProps) {
  const [quiz, setQuiz] = useState<QuizWithDetails | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuizData();
  }, [quizId]);

  async function loadQuizData() {
    try {
      setLoading(true);

      // Get auth token
      const { data: { session } } = await (window as any).supabase.auth.getSession();
      if (!session) {
        setError('Please login to view quiz');
        return;
      }

      // Fetch quiz details
      const response = await fetch(`/api/quizzes/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load quiz');
      }

      const data = await response.json();
      setQuiz(data.quiz);
      setAttempts(data.attempts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartQuiz() {
    if (!quiz) return;

    try {
      const { data: { session } } = await (window as any).supabase.auth.getSession();
      if (!session) {
        alert('Please login to take quiz');
        return;
      }

      // Start new attempt
      const response = await fetch(`/api/quizzes/${quiz.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to start quiz');
        return;
      }

      const data = await response.json();

      // Navigate to quiz taking page
      window.location.href = `/quizzes/${quiz.id}/take?attemptId=${data.attempt.id}`;
    } catch (err) {
      alert('Failed to start quiz. Please try again.');
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-8 bg-surface-hover rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-surface-hover rounded w-full mb-2"></div>
        <div className="h-4 bg-surface-hover rounded w-5/6"></div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="card border-error">
        <p className="text-error">{error || 'Quiz not found'}</p>
      </div>
    );
  }

  const bestAttempt = attempts.length > 0
    ? attempts.reduce((best, current) =>
        (current.score ?? 0) > (best.score ?? 0) ? current : best
      )
    : null;

  // Use server-provided availability fields if present, otherwise fall back to client calculation
  const canAttempt = quiz.canAttempt ?? ((quiz.max_attempts ?? 0) === 0 || attempts.length < (quiz.max_attempts ?? Infinity));
  const hasIncompleteAttempt = attempts.some(a => !a.submitted_at);

  // Use server-provided isAvailable, fall back to local check for display only
  const now = new Date();
  const isAvailable = (quiz as any).isAvailable ?? (quiz.is_published &&
    (!quiz.available_from || new Date(quiz.available_from) <= now) &&
    (!quiz.available_until || new Date(quiz.available_until) >= now));

  return (
    <div className="card bg-primary/5 border-primary">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>

          {quiz.description && (
            <p className="text-text-muted mb-4">{quiz.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm mb-4">
            {quiz.time_limit_minutes && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{quiz.time_limit_minutes} minutes</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Passing: {quiz.passing_score}%</span>
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>
                {(quiz.max_attempts ?? 0) === 0 ? 'Unlimited attempts' : `${quiz.max_attempts} attempt${(quiz.max_attempts ?? 0) > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Best Score */}
          {bestAttempt && (
            <div className="mb-4 p-3 bg-surface rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Your Best Score:</span>
                <span className={`font-bold ${bestAttempt.passed ? 'text-success' : 'text-error'}`}>
                  {bestAttempt.score}%
                </span>
              </div>
              {bestAttempt.passed && (
                <div className="flex items-center gap-2 mt-2 text-success text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Passed!</span>
                </div>
              )}
            </div>
          )}

          {/* Attempts Info */}
          {attempts.length > 0 && (
            <div className="mb-4 text-sm text-text-muted">
              {attempts.length} of {(quiz.max_attempts ?? 0) === 0 ? '∞' : quiz.max_attempts} attempts used
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {isAvailable ? (
              <>
                {hasIncompleteAttempt ? (
                  <button
                    onClick={handleStartQuiz}
                    className="btn btn-primary"
                  >
                    Continue Quiz
                  </button>
                ) : canAttempt ? (
                  <button
                    onClick={handleStartQuiz}
                    className="btn btn-primary"
                  >
                    {attempts.length === 0 ? 'Start Quiz' : 'Retake Quiz'}
                  </button>
                ) : (
                  <div className="text-text-muted">Maximum attempts reached</div>
                )}

                {attempts.length > 0 && (
                  <a
                    href={`/quizzes/${quiz.id}/attempts`}
                    className="btn btn-ghost"
                  >
                    View All Attempts
                  </a>
                )}
              </>
            ) : (
              <div className="text-text-muted">
                {!quiz.is_published && 'Quiz not published yet'}
                {quiz.available_from && new Date(quiz.available_from) > now &&
                  `Available from ${new Date(quiz.available_from).toLocaleDateString()}`}
                {quiz.available_until && new Date(quiz.available_until) < now &&
                  'Quiz deadline has passed'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
