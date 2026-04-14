/**
 * CohortStats Component
 * Displays overview statistics for a cohort including:
 * - Total students
 * - Active/Completed/Dropped counts
 * - Average completion rate
 * - Average time spent
 * - Engagement rate
 * - Struggling students count
 */

import React from 'react';
import type { CohortAnalytics } from '../types';

interface CohortStatsProps {
  analytics: CohortAnalytics | null;
  loading?: boolean;
}

export default function CohortStats({ analytics, loading = false }: CohortStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="card mb-8">
        <p className="text-center text-text-muted">No analytics data available</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Students',
      value: analytics.total_students,
      icon: '👥',
      color: 'bg-blue-500/10',
      textColor: 'text-blue-600'
    },
    {
      label: 'Active Students',
      value: analytics.active_students,
      icon: '✅',
      color: 'bg-green-500/10',
      textColor: 'text-green-600'
    },
    {
      label: 'Completed',
      value: analytics.completed_students,
      icon: '🎓',
      color: 'bg-purple-500/10',
      textColor: 'text-purple-600'
    },
    {
      label: 'Dropped',
      value: analytics.dropped_students,
      icon: '⚠️',
      color: 'bg-orange-500/10',
      textColor: 'text-orange-600'
    },
    {
      label: 'Avg. Completion',
      value: `${analytics.average_completion_percentage}%`,
      icon: '📊',
      color: 'bg-indigo-500/10',
      textColor: 'text-indigo-600'
    },
    {
      label: 'Avg. Time Spent',
      value: `${analytics.average_time_spent_hours}h`,
      icon: '⏱️',
      color: 'bg-cyan-500/10',
      textColor: 'text-cyan-600'
    },
    {
      label: 'Engagement Rate',
      value: `${analytics.engagement_rate}%`,
      icon: '🔥',
      color: 'bg-pink-500/10',
      textColor: 'text-pink-600',
      subtitle: 'Active in last 7 days'
    },
    {
      label: 'Struggling Students',
      value: analytics.struggling_students_count,
      icon: '🆘',
      color: 'bg-red-500/10',
      textColor: 'text-red-600',
      subtitle: 'Need attention'
    }
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Cohort Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{analytics.cohort_name}</h3>
            <p className="text-text-muted">{analytics.course_name}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              analytics.status === 'active' ? 'bg-green-500/10 text-green-600' :
              analytics.status === 'upcoming' ? 'bg-blue-500/10 text-blue-600' :
              analytics.status === 'completed' ? 'bg-gray-500/10 text-gray-600' :
              'bg-orange-500/10 text-orange-600'
            }`}>
              {analytics.status.charAt(0).toUpperCase() + analytics.status.slice(1)}
            </span>
            <p className="text-sm text-text-muted mt-2">
              {new Date(analytics.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {analytics.end_date && ` - ${new Date(analytics.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`p-3 ${stat.color} rounded-lg flex-shrink-0`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-muted truncate">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-text-muted mt-1">{stat.subtitle}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Course Info */}
      <div className="card bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted mb-1">Total Lessons in Course</p>
            <p className="text-3xl font-bold text-primary">{analytics.total_lessons}</p>
          </div>
          {analytics.average_completion_percentage > 0 && (
            <div className="text-right">
              <p className="text-sm text-text-muted mb-1">Overall Progress</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${analytics.average_completion_percentage}%` }}
                  ></div>
                </div>
                <span className="text-lg font-bold text-primary">
                  {analytics.average_completion_percentage}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
