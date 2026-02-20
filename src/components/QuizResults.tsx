/**
 * QuizResults Component
 *
 * Displays quiz results with score, feedback, and review options
 */

import type { Quiz, QuizAttempt } from '@/types/quiz';

interface QuizResultsProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  onRetry?: () => void;
  onReview?: () => void;
  canRetake: boolean;
}

export function QuizResults({
  quiz,
  attempt,
  onRetry,
  onReview,
  canRetake,
}: QuizResultsProps) {
  const scorePercentage = attempt.score ?? 0;
  const passed = attempt.passed ?? false;

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = () => {
    if (passed) return 'text-success';
    if (scorePercentage >= (quiz.passing_score ?? 70) * 0.8) return 'text-warning';
    return 'text-error';
  };

  const getMessage = () => {
    if (attempt.grading_status === 'needs_review') {
      return {
        title: 'Awaiting Review',
        description: 'Your quiz includes essay questions that need to be reviewed by your teacher. Your final score will be updated after grading is complete.',
        icon: (
          <svg className="w-16 h-16 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }

    if (passed) {
      return {
        title: 'Congratulations!',
        description: `You passed the quiz with ${scorePercentage}%! Great work!`,
        icon: (
          <svg className="w-16 h-16 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
      };
    }

    return {
      title: 'Quiz Complete',
      description: canRetake
        ? `You scored ${scorePercentage}% (passing: ${quiz.passing_score}%). You can retake the quiz to improve your score.`
        : `You scored ${scorePercentage}% (passing: ${quiz.passing_score}%). You've used all available attempts.`,
      icon: (
        <svg className="w-16 h-16 text-error" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
    };
  };

  const message = getMessage();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Score Card */}
      <div className="card text-center">
        <div className="flex justify-center mb-6">
          {message.icon}
        </div>

        <h2 className="text-3xl font-bold mb-2">{message.title}</h2>
        <p className="text-text-muted mb-8">{message.description}</p>

        {/* Score Circle */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <svg className="w-48 h-48 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-surface-hover"
              />
              {/* Score circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className={getScoreColor()}
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - scorePercentage / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-5xl font-bold ${getScoreColor()}`}>
                {scorePercentage}%
              </div>
              <div className="text-sm text-text-muted mt-1">
                {attempt.points_earned} / {attempt.total_points} points
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-surface rounded-lg">
            <div className="text-text-muted text-sm mb-1">Status</div>
            <div className={`text-lg font-bold ${passed ? 'text-success' : 'text-error'}`}>
              {passed ? 'Passed' : 'Not Passed'}
            </div>
          </div>

          <div className="p-4 bg-surface rounded-lg">
            <div className="text-text-muted text-sm mb-1">Time Spent</div>
            <div className="text-lg font-bold">
              {formatTime(attempt.time_taken_seconds)}
            </div>
          </div>

          <div className="p-4 bg-surface rounded-lg">
            <div className="text-text-muted text-sm mb-1">Attempt</div>
            <div className="text-lg font-bold">
              #{attempt.attempt_number}
            </div>
          </div>
        </div>

        {/* Teacher Feedback */}
        {attempt.teacher_feedback && (
          <div className="mb-8 p-4 bg-primary/5 rounded-lg border border-primary/20 text-left">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-primary mb-2">Teacher Feedback</div>
                <p className="text-sm whitespace-pre-wrap">{attempt.teacher_feedback}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          {quiz.show_correct_answers && (
            <button
              onClick={onReview}
              className="btn btn-primary"
            >
              Review Answers
            </button>
          )}

          {canRetake && attempt.grading_status !== 'needs_review' && (
            <button
              onClick={onRetry}
              className="btn btn-ghost"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake Quiz
            </button>
          )}

          <a
            href={`/quizzes/${quiz.id}/attempts`}
            className="btn btn-ghost"
          >
            View All Attempts
          </a>
        </div>
      </div>

      {/* Additional Info */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">What's Next?</h3>
        <div className="space-y-3 text-sm">
          {passed ? (
            <>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p>This quiz has been marked as complete in your progress.</p>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <p>Continue to the next lesson to keep learning!</p>
              </div>
            </>
          ) : (
            <>
              {canRetake && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" clipRule="evenodd" />
                  </svg>
                  <p>Review the lesson materials and try again when you're ready.</p>
                </div>
              )}
              {quiz.show_correct_answers && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  <p>Review the correct answers to learn from your mistakes.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
