/**
 * Due Date Countdown Component
 * Display countdown timer to assignment due date
 */
import React from 'react';

import { useState, useEffect } from 'react';

interface DueDateCountdownProps {
  dueDate: string;
  lateAllowed?: boolean;
}

export default function DueDateCountdown({ dueDate, lateAllowed = false }: DueDateCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPastDue, setIsPastDue] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'safe' | 'warning' | 'urgent' | 'overdue'>('safe');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const due = new Date(dueDate).getTime();
      const difference = due - now;

      if (difference <= 0) {
        setIsPastDue(true);
        setUrgencyLevel('overdue');
        const overdue = Math.abs(difference);
        const days = Math.floor(overdue / (1000 * 60 * 60 * 24));
        const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
          setTimeLeft(`${days} day${days > 1 ? 's' : ''} overdue`);
        } else {
          setTimeLeft(`${hours} hour${hours > 1 ? 's' : ''} overdue`);
        }
        return;
      }

      setIsPastDue(false);

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Set urgency level
      const hoursLeft = days * 24 + hours;
      if (hoursLeft < 6) {
        setUrgencyLevel('urgent');
      } else if (hoursLeft < 24) {
        setUrgencyLevel('warning');
      } else {
        setUrgencyLevel('safe');
      }

      // Format time string
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [dueDate]);

  const getColorClasses = () => {
    switch (urgencyLevel) {
      case 'safe':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-700 animate-pulse';
      case 'overdue':
        return lateAllowed
          ? 'bg-orange-50 border-orange-200 text-orange-700'
          : 'bg-gray-50 border-gray-300 text-gray-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getIcon = () => {
    switch (urgencyLevel) {
      case 'safe':
        return '✓';
      case 'warning':
        return '⚠️';
      case 'urgent':
        return '🚨';
      case 'overdue':
        return lateAllowed ? '⏰' : '🔒';
      default:
        return '⏰';
    }
  };

  const getMessage = () => {
    if (isPastDue) {
      if (lateAllowed) {
        return 'Late submission allowed';
      }
      return 'Submissions closed';
    }

    if (urgencyLevel === 'urgent') {
      return 'Due very soon!';
    } else if (urgencyLevel === 'warning') {
      return 'Due soon';
    }

    return 'Time remaining';
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getColorClasses()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getIcon()}</span>
          <span className="text-sm font-semibold uppercase tracking-wide">
            {getMessage()}
          </span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold mb-2 font-mono">
          {timeLeft}
        </div>
        <div className="text-sm opacity-75">
          Due: {new Date(dueDate).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
      </div>

      {isPastDue && lateAllowed && (
        <div className="mt-4 text-sm text-center">
          Note: Late submissions may incur a penalty
        </div>
      )}
    </div>
  );
}
