# src/components — React UI Components

## Purpose

All React islands (`.tsx`) and one Astro component. Organized into subdirectories by feature domain. Components are client-rendered islands mounted inside Astro pages via `client:load` or `client:visible` directives.

## Top-Level Components

| File | Description |
|------|-------------|
| `BlogEditor.tsx` | Rich text editor for blog post authoring (admin-facing). |
| `BlogPostForm.tsx` | Form for creating/editing blog post metadata (title, slug, category, published state). |
| `CohortStats.tsx` | Displays enrollment counts, completion rates, and activity metrics for a cohort. Used in teacher and admin dashboards. |
| `Comment.tsx` | Single comment display with author, timestamp, content, and moderation controls. |
| `CommentInput.tsx` | Controlled textarea for submitting a new discussion comment. |
| `CourseForum.tsx` | Top-level course discussion board. Composes `DiscussionThread` and `CommentInput`. |
| `DiscussionThread.tsx` | A single discussion thread with nested replies. |
| `EmailComposeModal.tsx` | Modal for composing and sending emails to students (used by teachers via `src/pages/api/teacher/send-email.ts`). |
| `Leaderboard.tsx` | Student ranking table by completion percentage or points. |
| `LessonDiscussionContainer.tsx` | Discussion section embedded in a lesson page. Fetches and renders lesson-scoped discussions. |
| `ModerationActions.tsx` | Admin/teacher controls to pin, hide, or delete discussion posts. |
| `NotificationBell.tsx` | Header notification icon with unread badge. Opens a notification dropdown. |
| `OptimizedImage.astro` | Astro component (not React) for lazy-loaded, responsive images with `width`/`height` attributes to prevent layout shift. |
| `ProgressChart.tsx` | Line or bar chart showing student progress over time. |
| `QuizCard.tsx` | Quiz listing card showing title, question count, time limit, attempt status. |
| `QuizProgress.tsx` | Progress indicator for an in-progress quiz attempt (question X of N). |
| `QuizQuestion.tsx` | Renders a single quiz question with appropriate input controls per `QuestionType`. |
| `QuizResults.tsx` | Post-submission result display with score, pass/fail, per-question feedback. |
| `QuizTimer.tsx` | Countdown timer for timed quiz attempts. Calls a callback on expiry. |
| `StrugglingStudents.tsx` | Teacher widget listing students below a progress threshold. |
| `Toast.tsx` | React toast notification component (complements the DOM-based `lib/notifications.ts`). |

## Subdirectories

| Directory | Contents |
|-----------|----------|
| `analytics/` | D3.js visualization components — see `analytics/CLAUDE.md` |
| `certificates/` | Certificate card display — see `certificates/CLAUDE.md` |
| `course/` | Course creation, card, lesson nav, progress bar, video player — see `course/CLAUDE.md` |
| `payments/` | Pricing table component — see `payments/CLAUDE.md` |
| `search/` | Search bar, filters, results, suggestions, empty state — see `search/CLAUDE.md` |
| `student/` | Student-facing widgets (AI key, assignment card, file uploader, etc.) — see `student/CLAUDE.md` |
| `teacher/` | Teacher-facing tools (assignment creator, grader, submissions list) — see `teacher/CLAUDE.md` |

## Key Patterns

- All components use the shared `src/lib/supabase.ts` client for data fetching — not direct fetch calls
- HTML sanitization: `CourseBuilder` uses `DOMPurify`; discussion/comment components use `sanitizeHTML` from `src/lib/security.ts`
- No component enforces auth — auth is server-side (middleware). Components assume they are rendered only to authorized users.

## Cross-References

- `src/lib/supabase.ts` — Supabase client used by most components
- `src/lib/notifications.ts` — toast helper used alongside `Toast.tsx`
- `src/types/` — domain types (Course, Lesson, Quiz, Assignment) imported by components
- `src/pages/` — Astro pages mount these as islands
