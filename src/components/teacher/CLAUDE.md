# src/components/teacher — Teacher-Facing Components

## Purpose

React components for the teacher dashboard: assignment authoring, grading, and submission review.

## Files

| File | Description |
|------|-------------|
| `AssignmentCreator.tsx` | Modal form for creating and editing assignments. Fields: title, description, instructions, due_date, max_points, allow_late_submissions, max_submissions, rubric criteria. Props: `lessonId`, `courseName`, `lessonName`, `editingAssignment` (null for create), `onClose`, `onSuccess`. Calls `POST /api/assignments` or `PUT /api/assignments/[id]`. |
| `AssignmentGrader.tsx` | Grading interface for a student submission. Renders rubric with editable score inputs per criterion, overall grade calculation, and a feedback text area. Calls `POST /api/assignments/[id]/grade`. |
| `SubmissionsList.tsx` | Table of all submissions for an assignment. Columns: student name, submitted_at, status badge, grade, link to grader. Supports sorting and filtering. |

## Key Patterns

- All three components require teacher or admin role — this is enforced server-side in middleware, not in the components themselves
- `AssignmentCreator` handles both create and edit in one component via the `editingAssignment` prop (null = create mode)
- Rubric scoring in `AssignmentGrader` sums per-criterion points to derive total; must stay consistent with `types/assignment.ts` `rubric_scores` JSONB structure

## Cross-References

- `src/pages/teacher/courses.astro` — mounts `AssignmentCreator`
- `src/pages/assignments/[id]/submissions/[submissionId].astro` — mounts `AssignmentGrader`
- `src/pages/assignments/index.astro` — mounts `SubmissionsList`
- `src/pages/api/assignments/` — API routes called by these components
- `tests/components/` — component unit tests
