/**
 * QuizTimer Component
 *
 * Countdown timer for timed quizzes with visual warnings
 */

import React, { useState, useEffect, useCallback } from 'react';

interface QuizTimerProps {
  startedAt: string;
  timeLimit: number | null; // in minutes
  onTimeUp?: () => void;
}

export function QuizTimer({ startedAt, timeLimit, onTimeUp }: QuizTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  const calculateRemaining = useCallback(() => {
    if (!timeLimit) return null;

    const started = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - started) / 1000); // seconds
    const total = timeLimit * 60; // convert minutes to seconds
    const remaining = Math.max(0, total - elapsed);

    return remaining;
  }, [startedAt, timeLimit]);

  useEffect(() => {
    if (!timeLimit) return;

    // Initial calculation
    const initial = calculateRemaining();
    if (initial !== null) {
      setRemainingSeconds(initial);
      if (initial === 0) {
        setIsExpired(true);
        onTimeUp?.();
      }
    }

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateRemaining();

      if (remaining !== null) {
        setRemainingSeconds(remaining);

        if (remaining === 0 && !isExpired) {
          setIsExpired(true);
          onTimeUp?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimit, calculateRemaining, onTimeUp, isExpired]);

  if (!timeLimit) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>No time limit</span>
      </div>
    );
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const percentRemaining = (remainingSeconds / (timeLimit * 60)) * 100;

  // Determine color based on time remaining
  const getColorClass = () => {
    if (isExpired) return 'text-error';
    if (percentRemaining < 10) return 'text-error';
    if (percentRemaining < 25) return 'text-warning';
    return 'text-primary';
  };

  const getBgClass = () => {
    if (isExpired) return 'bg-error/10 border-error';
    if (percentRemaining < 10) return 'bg-error/10 border-error';
    if (percentRemaining < 25) return 'bg-warning/10 border-warning';
    return 'bg-primary/10 border-primary';
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${getBgClass()}`}>
      <div className="relative">
        <svg className="w-12 h-12 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-surface-hover"
          />
          {/* Progress circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className={getColorClass()}
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - percentRemaining / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className={`w-6 h-6 ${getColorClass()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1">
        <div className={`text-2xl font-bold font-mono ${getColorClass()}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className={`text-sm ${getColorClass()}`}>
          {isExpired ? 'Time is up!' : 'Time remaining'}
        </div>
      </div>

      {/* Warning messages */}
      {!isExpired && percentRemaining < 25 && (
        <div className="flex-shrink-0">
          <svg
            className={`w-6 h-6 ${percentRemaining < 10 ? 'text-error animate-pulse' : 'text-warning'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
