/**
 * MetricCard Component
 * Agent 4: Visualization & Interaction Expert
 *
 * Display key metrics with trend indicators and comparison data
 */

import React, { useEffect, useState } from 'react';

interface Props {
  title: string;
  value: string | number;
  previousValue?: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  loading?: boolean;
  onClick?: () => void;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  previousValue,
  trend,
  trendValue,
  icon,
  color = 'blue',
  loading = false,
  onClick,
  subtitle
}: Props) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'number' && !loading) {
      let start = 0;
      const end = value;
      const duration = 1000;
      const increment = (end - start) / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setAnimatedValue(end);
          clearInterval(timer);
        } else {
          setAnimatedValue(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [value, loading]);

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    purple: 'text-purple-600 dark:text-purple-400'
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    const trendIcons = {
      up: '↗',
      down: '↘',
      stable: '→'
    };

    const trendColors = {
      up: 'text-green-600',
      down: 'text-red-600',
      stable: 'text-gray-500'
    };

    return (
      <span className={`text-2xl ${trendColors[trend]}`}>
        {trendIcons[trend]}
      </span>
    );
  };

  const displayValue = typeof value === 'number' ? animatedValue : value;

  return (
    <div
      className={`
        relative p-6 rounded-xl border-2 transition-all duration-300
        ${colorClasses[color]}
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}
        ${loading ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
              {subtitle}
            </p>
          )}
          {loading ? (
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ) : (
            <p className="text-4xl font-bold text-gray-900 dark:text-white">
              {displayValue}
            </p>
          )}
        </div>

        {icon && (
          <div className={`text-4xl ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || trendValue) && !loading && (
        <div className="mt-4 flex items-center space-x-2">
          {getTrendIcon()}
          {trendValue && (
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {trendValue}
            </span>
          )}
          {previousValue && (
            <span className="text-sm text-gray-500">
              vs. previous period
            </span>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-4 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      )}
    </div>
  );
}
