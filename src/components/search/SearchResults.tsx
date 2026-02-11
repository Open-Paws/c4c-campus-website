/**
 * SearchResults Component
 *
 * Displays search results with metadata
 */

interface SearchResult {
  id: number;
  type: 'course' | 'lesson' | 'discussion' | 'forum';
  title: string;
  description: string;
  url: string;
  relevance: number;
  metadata: Record<string, any>;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  total: number;
}

export default function SearchResults({ results, query, total }: SearchResultsProps) {
  if (results.length === 0) {
    return null;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-blue-100 text-blue-800';
      case 'lesson':
        return 'bg-green-100 text-green-800';
      case 'discussion':
        return 'bg-purple-100 text-purple-800';
      case 'forum':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'lesson':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'discussion':
      case 'forum':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        Found <span className="font-semibold">{total}</span> result{total !== 1 ? 's' : ''} for "
        <span className="font-semibold">{query}</span>"
      </div>

      {results.map((result) => (
        <article
          key={`${result.type}-${result.id}`}
          className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-green-300 transition-all group bg-white"
        >
          {/* Type Badge and Icon */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded ${getTypeColor(result.type)}`}>
              {getTypeIcon(result.type)}
              {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
            </span>
            {import.meta.env.DEV && (
              <span className="text-xs text-gray-400">
                Relevance: {(result.relevance * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold mb-2">
            <a
              href={result.url}
              className="text-gray-900 hover:text-green-600 group-hover:text-green-600 transition-colors"
            >
              {result.title}
            </a>
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {result.description}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {result.metadata.track && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {result.metadata.track.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            )}
            {result.metadata.difficulty && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {result.metadata.difficulty.charAt(0).toUpperCase() + result.metadata.difficulty.slice(1)}
              </span>
            )}
            {result.metadata.default_duration_weeks && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {result.metadata.default_duration_weeks} weeks
              </span>
            )}
            {result.metadata.course_name && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {result.metadata.course_name}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
