/**
 * SearchSuggestions Component
 *
 * Autocomplete dropdown for search suggestions
 */

import React from 'react';

interface SearchSuggestionsProps {
  suggestions: string[];
  onClick: (suggestion: string) => void;
}

export default function SearchSuggestions({ suggestions, onClick }: SearchSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      id="search-suggestions"
      className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
      role="listbox"
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onClick(suggestion)}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
          role="option"
          aria-selected="false"
        >
          <div className="flex items-center gap-3">
            <svg
              className="h-4 w-4 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-sm text-gray-900 truncate">{suggestion}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
