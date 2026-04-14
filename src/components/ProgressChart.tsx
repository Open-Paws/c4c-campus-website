/**
 * ProgressChart Component
 * Visualizes cohort progress over time using Chart.js
 * Shows:
 * - Completed lessons trend
 * - Active students trend
 * - New enrollments
 * - Average completion rate
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { ProgressOverTime } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProgressChartProps {
  progressData: ProgressOverTime[];
  loading?: boolean;
  chartType?: 'line' | 'bar';
}

export default function ProgressChart({
  progressData,
  loading = false,
  chartType = 'line'
}: ProgressChartProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!progressData || progressData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Progress Over Time</h3>
        <p className="text-center text-text-muted py-8">No progress data available yet</p>
      </div>
    );
  }

  // Prepare chart data
  const labels = progressData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Completed Lessons',
        data: progressData.map(d => d.completed_lessons),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Active Students',
        data: progressData.map(d => d.active_students),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'New Enrollments',
        data: progressData.map(d => d.new_enrollments),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const completionRateData = {
    labels,
    datasets: [
      {
        label: 'Avg. Completion Rate (%)',
        data: progressData.map(d => d.average_completion_rate),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const completionRateOptions = {
    ...options,
    scales: {
      ...options.scales,
      y: {
        ...options.scales.y,
        max: 100,
        ticks: {
          callback: (value: string | number) => `${value}%`
        }
      }
    }
  } as const;

  // Calculate summary statistics
  const totalCompletions = progressData.reduce((sum, d) => sum + d.completed_lessons, 0);
  const totalEnrollments = progressData.reduce((sum, d) => sum + d.new_enrollments, 0);
  const avgCompletionRate = progressData.length > 0
    ? Math.round(progressData.reduce((sum, d) => sum + d.average_completion_rate, 0) / progressData.length)
    : 0;

  const ChartComponent = chartType === 'line' ? Line : Bar;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Completions (30d)</p>
              <p className="text-3xl font-bold text-blue-600">{totalCompletions}</p>
            </div>
            <span className="text-4xl">📚</span>
          </div>
        </div>
        <div className="card bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">New Enrollments (30d)</p>
              <p className="text-3xl font-bold text-purple-600">{totalEnrollments}</p>
            </div>
            <span className="text-4xl">👋</span>
          </div>
        </div>
        <div className="card bg-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Avg. Completion Rate</p>
              <p className="text-3xl font-bold text-pink-600">{avgCompletionRate}%</p>
            </div>
            <span className="text-4xl">📈</span>
          </div>
        </div>
      </div>

      {/* Main Activity Chart */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-lg font-bold">Activity Trends (Last 30 Days)</h3>
          <p className="text-sm text-text-muted">Track student activity and lesson completions over time</p>
        </div>
        <div style={{ height: '350px' }}>
          <ChartComponent data={chartData} options={options} />
        </div>
      </div>

      {/* Completion Rate Chart */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-lg font-bold">Completion Rate Trend</h3>
          <p className="text-sm text-text-muted">Average daily completion rate across all students</p>
        </div>
        <div style={{ height: '250px' }}>
          <Line data={completionRateData} options={completionRateOptions} />
        </div>
      </div>
    </div>
  );
}
