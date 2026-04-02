# src/types — TypeScript Type System

## Purpose

TypeScript type definitions for the application. Split between auto-generated database types (do not edit) and hand-authored application types that add stronger guarantees on top of the generated layer.

## Files

| File | Description |
|------|-------------|
| `generated.ts` | **DO NOT EDIT.** Auto-generated from `schema.sql` via `npm run db:types`. Contains `*Row` types for every database table (e.g., `CourseRow`, `LessonRow`, `QuizAttemptRow`). Regenerate after any schema discussion, but remember: `schema.sql` is immutable. |
| `index.ts` | Application-level types extending generated types. Key interfaces: `Course` (extends `CourseRow` with required `track`, `difficulty`, `created_by`), `Module` (alias for `ModuleRow`), `Lesson` (adds typed `resources` array), `Enrollment`, `CohortSchedule`, `LessonDiscussion`, `CourseForumPost`, `Notification`. Imports exclusively from `./generated`. |
| `quiz.ts` | Quiz system types. Exports: `QuestionType` union (must match schema CHECK constraint), `GradingStatus`, `QuizDifficulty`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `CreateQuizRequest`, `SubmitAttemptRequest`, `QuizAttemptResult`. Imports base row types from `./generated`. |
| `assignment.ts` | Assignment system types. Exports: `Assignment` (extends `AssignmentRow`), `Submission` (extends `AssignmentSubmissionRow` with typed `rubric_scores` and narrowed `status` union), `AssignmentWithSubmission`, `RubricCriteria`. Note: `SubmissionHistory` interface is deprecated — not backed by a DB table. |
| `messaging.ts` | Messaging and communication types. Exports: `MessageThread`, `Message`, `MessageReadReceipt`, `Notification`, `Announcement`. Types mirror the `message_threads`, `messages`, `notifications`, `announcements` tables. |
| `platform-config.ts` | White-labeling configuration types. Exports: `PlatformBranding` (colors, logos, brand identity), `PlatformFeatureFlags`, `PlatformConfig`. Used for future multi-tenant configuration. |

## Key Invariants

- **UUID vs BIGSERIAL:** `cohorts.id` is UUID (string); `courses.id`, `modules.id`, `lessons.id` are BIGSERIAL (number). Mixing these causes runtime errors.
- **snake_case everywhere:** All database field names are snake_case; TypeScript mirrors this — never use camelCase aliases in DB queries.
- **CHECK constraint alignment:** TypeScript unions must exactly match schema CHECK constraints. See `CLAUDE.md` root for examples.
- **No manual edits to `generated.ts`:** Run `npm run db:types:check` to verify generated types are in sync.

## Cross-References

- `schema.sql` — source of truth for all `*Row` types in `generated.ts`
- `src/lib/api-handlers.ts` — imports `Course`, `Enrollment` from `index.ts`
- `src/lib/quiz-grading.ts` — imports quiz types from `quiz.ts`
- `src/lib/assignment-status.ts` — imports `Assignment`, `Submission` from `assignment.ts`
- `src/components/` — most React components import domain types from this directory
