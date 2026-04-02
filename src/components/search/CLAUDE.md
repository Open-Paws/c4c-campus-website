# src/components/search — Search UI Components

## Purpose

Full-text search UI for course and content discovery. Five components compose a complete search experience.

## Files

| File | Description |
|------|-------------|
| `SearchBar.tsx` | Input with debounce. Emits search query string to parent on change. Includes a clear button and loading indicator. |
| `SearchFilters.tsx` | Filter panel for narrowing results by track, difficulty, and content type. Emits a filter object to parent. |
| `SearchResults.tsx` | Renders a list of search result items. Each item shows title, type badge (course/lesson/blog), and a description excerpt. |
| `SearchSuggestions.tsx` | Dropdown of typeahead suggestions shown while the user types. Populated from a recent-searches list or a suggestion API. |
| `NoResults.tsx` | Empty state shown when search returns zero results. Suggests broadening filters or shows popular courses. |

## Key Patterns

- Search components are stateless presentational shells — state is managed in the parent page (`/courses.astro` or a dedicated search page)
- `SearchBar` debounce prevents API flooding — default is likely 300ms; verify before changing
- Admin search analytics are tracked separately via `src/pages/admin/search-analytics.astro`

## Cross-References

- `src/pages/courses.astro` — primary consumer of the search components
- `src/pages/admin/search-analytics.astro` — admin view of search usage patterns
- `src/pages/api/users/search.ts` — user search endpoint (admin use)
