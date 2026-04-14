/**
 * SearchFilters Component
 *
 * Filter sidebar for search results
 */

import React from 'react';

interface SearchFiltersProps {
  filters: {
    track?: string;
    difficulty?: string;
    type?: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  const handleChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  const hasActiveFilters = filters.track || filters.difficulty || filters.type;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-5 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={() => onFilterChange({})}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Content Type */}
      <div>
        <label htmlFor="filter-type" className="block text-sm font-medium text-gray-700 mb-2">
          Content Type
        </label>
        <select
          id="filter-type"
          value={filters.type || 'all'}
          onChange={(e) => handleChange('type', e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
        >
          <option value="all">All Types</option>
          <option value="course">Courses</option>
          <option value="lesson">Lessons</option>
          <option value="discussion">Discussions</option>
          <option value="forum">Forums</option>
        </select>
      </div>

      {/* Track */}
      <div>
        <label htmlFor="filter-track" className="block text-sm font-medium text-gray-700 mb-2">
          Track
        </label>
        <select
          id="filter-track"
          value={filters.track || 'all'}
          onChange={(e) => handleChange('track', e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
        >
          <option value="all">All Tracks</option>
          <option value="animal-advocacy">Animal Advocacy</option>
          <option value="climate">Climate</option>
          <option value="ai-safety">AI Safety</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Difficulty */}
      <div>
        <label htmlFor="filter-difficulty" className="block text-sm font-medium text-gray-700 mb-2">
          Difficulty
        </label>
        <select
          id="filter-difficulty"
          value={filters.difficulty || 'all'}
          onChange={(e) => handleChange('difficulty', e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {filters.type && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                {filters.type}
                <button
                  onClick={() => handleChange('type', 'all')}
                  className="hover:text-green-900"
                  aria-label="Remove type filter"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.track && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                {filters.track}
                <button
                  onClick={() => handleChange('track', 'all')}
                  className="hover:text-green-900"
                  aria-label="Remove track filter"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.difficulty && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                {filters.difficulty}
                <button
                  onClick={() => handleChange('difficulty', 'all')}
                  className="hover:text-green-900"
                  aria-label="Remove difficulty filter"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
