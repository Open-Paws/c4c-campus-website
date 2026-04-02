# src/components/course — Course UI Components

## Purpose

Components for displaying, navigating, and building course content. Used in both the student-facing course pages and the teacher course management interface.

## Files

| File | Description |
|------|-------------|
| `CourseBuilder.tsx` | Teacher interface for creating and editing courses. Form fields: title, description, track (must match `VALID_TRACKS`), difficulty, duration, slug. Uses `DOMPurify` for XSS sanitization of rich text fields. Props: `course` (optional, for edit mode), `onSave`, `onPublish`. |
| `CourseCard.tsx` | Course listing card. Displays title, track badge, difficulty, enrollment count, and a CTA. Used on `/courses` and teacher dashboards. |
| `LessonNav.tsx` | Sidebar navigation for lesson pages. Shows module/lesson tree with completion checkmarks and locked indicators (time-gating). |
| `ProgressBar.tsx` | Horizontal progress bar with percentage label. Props: `completed`, `total`, `showLabel`. |
| `VideoPlayer.tsx` | YouTube or direct-video player with progress tracking. Reports watch percentage to the progress API. Handles time-gated content (shows locked state when module is locked). |

## Key Patterns

- `CourseBuilder` validates track and difficulty values against the same constants as the API (`VALID_TRACKS`, `VALID_DIFFICULTIES`) — keep in sync with `src/lib/api-handlers.ts`
- `LessonNav` receives pre-computed unlock status from the parent page (server-side time-gating via `src/lib/time-gating.ts`) — it does not re-query Supabase directly
- `VideoPlayer` uses YouTube's `onStateChange` to track watch time; progress is posted to the lesson progress API

## Cross-References

- `src/lib/time-gating.ts` — module unlock logic consumed by `LessonNav` and `VideoPlayer`
- `src/lib/api-handlers.ts` — `VALID_TRACKS`, `VALID_DIFFICULTIES` must match `CourseBuilder` validation
- `src/pages/courses/[slug].astro` — mounts `CourseCard`, `LessonNav`, `VideoPlayer`
- `src/pages/teacher/courses.astro` — mounts `CourseBuilder`
- `tests/components/CourseBuilder.test.tsx`, `CourseCard.test.tsx`, `LessonNav.test.tsx`, `ProgressBar.test.tsx`, `VideoPlayer.test.tsx`
