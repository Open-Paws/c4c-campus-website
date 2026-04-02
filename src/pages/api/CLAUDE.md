# src/pages/api — API Endpoints

## Purpose

All server-side API routes. Every file exports HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`) and sets `export const prerender = false`. Auth is enforced per-route via `src/lib/auth.authenticateRequest()` (JWT verify + role check), not by middleware (middleware only guards page routes).

## Authentication Pattern

Most API routes follow this pattern:
```typescript
const authResult = await authenticateRequest(request);
if (authResult instanceof Response) return authResult;
const { user, token } = authResult;
const supabase = createServiceClient(); // bypasses RLS — only after verifyJWT
```

Some older routes use `Authorization: Bearer` header + `supabase.auth.getUser()` instead — these are authenticated via Supabase's own token check rather than the JWKS-based `verifyJWT`. Both patterns are valid but inconsistent; prefer `authenticateRequest` + `createServiceClient` for new routes.

## Endpoints by Domain

### Application

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `apply.ts` | `/api/apply` | POST | Student application submission. Creates Supabase Auth user + inserts `applications` row. Validates password strength, email format, required fields. Returns structured error codes. |
| `contact.ts` | `/api/contact` | POST | Contact form submission. |
| `enroll.ts` | `/api/enroll` | POST | Course enrollment (legacy — check for duplication with `enroll-cohort.ts`). |
| `enroll-cohort.ts` | `/api/enroll-cohort` | POST | Cohort-specific enrollment. |

### Admin

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `admin/update-application-status.ts` | `/api/admin/update-application-status` | POST | Update an application's review status and send status email via Resend. Requires admin role. |
| `admin/assign-reviewer.ts` | `/api/admin/assign-reviewer` | POST | Assign an admin reviewer to an application. |
| `admin/reviewers.ts` | `/api/admin/reviewers` | GET | List available reviewers. |

### AI Key Management

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `ai/provision-key.ts` | `/api/ai/provision-key` | POST | Provision an OpenRouter API key for the authenticated student. Idempotent — returns existing key hash if already provisioned. One-time key reveal: the plain key is returned only on first provision. |
| `ai/key-status.ts` | `/api/ai/key-status` | GET | Get current key usage, weekly limit, and limit_remaining for the student. |
| `ai/regenerate-key.ts` | `/api/ai/regenerate-key` | POST | Delete old key and provision a new one. Rate-limited to prevent abuse. |

### Assignments

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `assignments/index.ts` | `/api/assignments` | GET, POST | List assignments for a lesson (GET) or create a new assignment (POST, teacher only). |
| `assignments/[id].ts` | `/api/assignments/[id]` | GET, PUT, DELETE | Get, update, or delete a specific assignment. |
| `assignments/[id]/submit.ts` | `/api/assignments/[id]/submit` | POST | Student submits an assignment. Validates file path, due date, submission limits. |
| `assignments/[id]/grade.ts` | `/api/assignments/[id]/grade` | POST | Teacher grades a submission with rubric scores and feedback. |
| `assignments/[id]/submissions.ts` | `/api/assignments/[id]/submissions` | GET | List all submissions for an assignment (teacher view). |

### Blog

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `blog.ts` | `/api/blog` | GET, POST | List blog posts (GET, public) or create a new post (POST, admin). |
| `blog/[id].ts` | `/api/blog/[id]` | GET, PUT, DELETE | CRUD for individual blog posts. |
| `blog/upload-image.ts` | `/api/blog/upload-image` | POST | Upload an image for a blog post to Supabase Storage. |

### Certificates

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `certificates/index.ts` | `/api/certificates` | GET, POST | List student certificates (GET) or issue a certificate (POST, admin/system). |
| `certificates/verify/[code].ts` | `/api/certificates/verify/[code]` | GET | Public certificate verification by unique code. No auth required. |

### Cohorts

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `cohorts.ts` | `/api/cohorts` | GET | List cohorts. Students see enrolled cohorts; teachers see their course cohorts. |
| `cohorts/[id].ts` | `/api/cohorts/[id]` | GET, PUT, DELETE | Get or manage a specific cohort. |
| `cohorts/[id]/enroll.ts` | `/api/cohorts/[id]/enroll` | POST | Enroll a student in a cohort. |
| `cohorts/[id]/schedule.ts` | `/api/cohorts/[id]/schedule` | GET, POST, PUT | Manage module unlock schedule for a cohort. |

### Content

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `content/media.ts` | `/api/content/media` | GET, POST | Media library management. |

### Cron

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `cron/module-unlock-notifications.ts` | `/api/cron/module-unlock-notifications` | POST | Sends notifications when modules unlock per cohort schedule. Triggered by external cron (e.g., Vercel cron). |

### Discussions

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `discussions.ts` | `/api/discussions` | GET, POST | List or create discussions. Supports `type=lesson` (by lesson_id) or `type=forum` (by course_id). |
| `discussions/[id]/reply.ts` | `/api/discussions/[id]/reply` | POST | Reply to a discussion thread. |
| `discussions/[id]/moderate.ts` | `/api/discussions/[id]/moderate` | POST | Pin, hide, or delete a discussion (teacher/admin only). |

### Quizzes

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `quizzes/index.ts` | `/api/quizzes` | POST | Create a new quiz (teacher/admin). |
| `quizzes/[id]/index.ts` | `/api/quizzes/[id]` | GET, PUT, DELETE | CRUD for a quiz. |
| `quizzes/[id]/start.ts` | `/api/quizzes/[id]/start` | POST | Start a new attempt. Validates availability via `lib/quiz-grading.checkQuizAvailability`. |
| `quizzes/[id]/attempts/[attemptId]/index.ts` | `/api/quizzes/[id]/attempts/[attemptId]` | GET | Get attempt state (used for resume). |
| `quizzes/[id]/attempts/[attemptId]/save.ts` | `/api/quizzes/[id]/attempts/[attemptId]/save` | POST | Save in-progress answers without submitting. |
| `quizzes/[id]/attempts/[attemptId]/submit.ts` | `/api/quizzes/[id]/attempts/[attemptId]/submit` | POST | Submit and grade an attempt. Calls `lib/quiz-grading.gradeQuiz`. |

### Submissions

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `submissions/[id]/download.ts` | `/api/submissions/[id]/download` | GET | Generate a signed download URL for a submission file. |

### Teacher

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `teacher/approved-students.ts` | `/api/teacher/approved-students` | GET | List students with approved/enrolled status for a course. |
| `teacher/cohort-analytics.ts` | `/api/teacher/cohort-analytics` | GET | Aggregated analytics for a cohort (completion rates, activity). |
| `teacher/enroll-student.ts` | `/api/teacher/enroll-student` | POST | Manually enroll a student in a cohort. |
| `teacher/send-email.ts` | `/api/teacher/send-email` | POST | Send an email to one or more students via Resend. |

### Users

| File | Route | Method(s) | Description |
|------|-------|-----------|-------------|
| `users/search.ts` | `/api/users/search` | GET | Search users by name or email (admin only). Used by `EmailComposeModal`. |

## Common Error Response Shape

```typescript
{ data: T | null, error: { code: string, message: string, details?: any } | null }
```

Or for simple errors: `{ error: string }` with HTTP status code.

## Cross-References

- `src/lib/auth.ts` — `authenticateRequest`, `createServiceClient`, role verify functions
- `src/lib/quiz-grading.ts` — grading logic used by quiz routes
- `src/lib/assignment-status.ts` — status derivation used by assignment routes
- `src/lib/time-gating.ts` — access checks used by lesson/module routes
- `src/lib/email-notifications.ts` — email sending used by apply, admin status, teacher email
- `src/lib/openrouter.ts` — key management used by ai/* routes
- `src/lib/rate-limiter.ts` — rate limiting applied to forms and expensive routes
