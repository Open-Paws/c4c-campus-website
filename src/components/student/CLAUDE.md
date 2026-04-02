# src/components/student — Student-Facing Widgets

## Purpose

React components embedded in the student dashboard and lesson pages. Handle assignment workflow, AI key provisioning, and supporting UX elements.

## Files

| File | Description |
|------|-------------|
| `AIKeyWidget.tsx` | Auto-provisions an OpenRouter API key on first load, stores key hash in `profiles.preferences`. Shows one-time key reveal modal (key is never re-shown after dismiss). Displays weekly usage bar and regenerate flow. States: loading, no_config, provisioning, ready, error. Calls `/api/ai/provision-key`, `/api/ai/key-status`, `/api/ai/regenerate-key`. |
| `AssignmentCard.tsx` | Assignment listing card on the student dashboard. Shows title, due date, submission status badge (via `lib/assignment-status.ts`), and a link to the assignment detail page. |
| `AssignmentRubric.tsx` | Displays the grading rubric for an assignment. Read-only view for students; shows criteria, point values, and (after grading) earned points. |
| `DueDateCountdown.tsx` | Countdown display component. Shows days/hours remaining until an assignment due date; turns red when < 24 hours. |
| `FileUploader.tsx` | Drag-and-drop file upload for assignment submissions. Validates file type and size via `lib/file-upload.validateFile`, uploads to Supabase Storage, returns the storage path. |
| `SubmissionHistory.tsx` | Lists all prior submissions for an assignment with timestamp, status badge, and grade if available. Note: backed by query logic, not a dedicated DB table (see `types/assignment.ts` deprecation note). |
| `SubmissionStatus.tsx` | Inline status badge for a single submission. Derives display state from `lib/assignment-status.calculateAssignmentStatus`. |

## Key Patterns

- `AIKeyWidget` is the only component that touches the OpenRouter API — all key management flows through it
- File upload size limits and MIME type allowlists are enforced in `lib/file-upload.ts`, not in `FileUploader` itself
- Assignment status derivation is centralized in `lib/assignment-status.ts` — `AssignmentCard`, `SubmissionStatus` both delegate to it

## Cross-References

- `src/lib/file-upload.ts` — upload/validation logic for `FileUploader`
- `src/lib/openrouter.ts` — API key operations called by `/api/ai/*` routes
- `src/lib/assignment-status.ts` — status derivation used by `AssignmentCard`, `SubmissionStatus`
- `src/pages/dashboard.astro` — mounts `AIKeyWidget`
- `src/pages/assignments/[id].astro` — mounts `AssignmentRubric`, `FileUploader`, `SubmissionHistory`
- `tests/components/` — component unit tests
