/**
 * Leaderboard Component
 * Displays top performing students in the cohort
 * Ranked by completion percentage and lessons completed
 * Shows:
 * - Top 10 students
 * - Completion percentage
 * - Time spent
 * - Last activity
 */

import React, { useState } from 'react';
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
}

export default function Leaderboard({ entries, loading = false }: LeaderboardProps) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏆</span>
          <h3 className="text-lg font-bold">Top Performers</h3>
        </div>
        <p className="text-center text-text-muted py-8">
          No student progress yet. Check back once students start completing lessons!
        </p>
      </div>
    );
  }

  const displayedEntries = showAll ? entries : entries.slice(0, 5);

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default: return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const formatLastActivity = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h3 className="text-lg font-bold">Top Performers</h3>
            <p className="text-sm text-text-muted">Students leading the way</p>
          </div>
        </div>
        {entries.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary hover:underline"
          >
            {showAll ? 'Show Less' : `Show All (${entries.length})`}
          </button>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3">
        {displayedEntries.map((entry) => {
          const isTopThree = entry.rank <= 3;
          const medal = getMedalEmoji(entry.rank);
          const rankColor = getRankColor(entry.rank);

          return (
            <div
              key={entry.user_id}
              className={`
                rounded-lg p-4 transition-all
                ${isTopThree
                  ? 'bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 shadow-md hover:shadow-lg'
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  {isTopThree ? (
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      text-2xl shadow-lg
                      ${rankColor}
                    `}>
                      {medal}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-600">{medal}</span>
                    </div>
                  )}
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base truncate mb-1">{entry.name}</h4>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-text-muted block text-xs">Completion</span>
                      <span className={`font-bold ${getCompletionColor(entry.completion_percentage)}`}>
                        {entry.completion_percentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Lessons</span>
                      <span className="font-bold text-blue-600">{entry.completed_lessons}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Time</span>
                      <span className="font-bold text-purple-600">{entry.time_spent_hours}h</span>
                    </div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-xs text-text-muted block">Last active</span>
                  <span className="text-sm font-medium">
                    {formatLastActivity(entry.last_activity_at)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isTopThree ? rankColor : 'bg-blue-500'
                    }`}
                    style={{ width: `${entry.completion_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {entries.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {Math.round(entries.reduce((sum, e) => sum + e.completion_percentage, 0) / entries.length)}%
              </p>
              <p className="text-xs text-text-muted mt-1">Avg. Completion</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(entries.reduce((sum, e) => sum + e.completed_lessons, 0) / entries.length)}
              </p>
              <p className="text-xs text-text-muted mt-1">Avg. Lessons</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {(entries.reduce((sum, e) => sum + e.time_spent_hours, 0) / entries.length).toFixed(1)}h
              </p>
              <p className="text-xs text-text-muted mt-1">Avg. Time</p>
            </div>
          </div>
        </div>
      )}

      {/* Motivational Message */}
      {entries.length > 0 && entries[0].completion_percentage === 100 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <p className="text-sm text-green-800">
              <strong>{entries[0].name}</strong> has completed the entire course! Congratulations!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
