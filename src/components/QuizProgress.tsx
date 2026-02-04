/**
 * QuizProgress Component
 *
 * Shows quiz progress with question counter and progress bar
 */

import { useMemo } from 'react';

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: Set<number>;
  showAll?: boolean; // Show all questions as dots
}

export function QuizProgress({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  showAll = false,
}: QuizProgressProps) {
  const percentComplete = useMemo(() => {
    if (totalQuestions === 0) return 0;
    return Math.round((answeredQuestions.size / totalQuestions) * 100);
  }, [answeredQuestions.size, totalQuestions]);

  return (
    <div className="space-y-4">
      {/* Progress bar with numbers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">
            Question {currentQuestion} of {totalQuestions}
          </div>
          <div className="text-sm text-text-muted">
            {answeredQuestions.size} answered
          </div>
        </div>

        <div className="relative w-full h-3 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Question indicators (optional, for smaller quizzes) */}
      {showAll && totalQuestions <= 20 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
            const isAnswered = answeredQuestions.has(num);
            const isCurrent = num === currentQuestion;

            return (
              <div
                key={num}
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium
                  transition-all duration-200
                  ${isCurrent
                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                    : isAnswered
                    ? 'bg-success/20 text-success border-2 border-success'
                    : 'bg-surface-hover text-text-muted border-2 border-border'
                  }
                `}
                title={`Question ${num} ${isAnswered ? '(answered)' : '(not answered)'}`}
              >
                {isAnswered && !isCurrent ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  num
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Compact view for larger quizzes */}
      {showAll && totalQuestions > 20 && (
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
            const isAnswered = answeredQuestions.has(num);
            const isCurrent = num === currentQuestion;

            return (
              <div
                key={num}
                className={`
                  h-2 rounded-full transition-all duration-200
                  ${isCurrent
                    ? 'bg-primary'
                    : isAnswered
                    ? 'bg-success'
                    : 'bg-surface-hover'
                  }
                `}
                title={`Question ${num}`}
              />
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-text-muted">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-surface-hover"></div>
            <span className="text-text-muted">Not answered</span>
          </div>
        </div>
        <div className="font-medium">
          {percentComplete}% complete
        </div>
      </div>
    </div>
  );
}
