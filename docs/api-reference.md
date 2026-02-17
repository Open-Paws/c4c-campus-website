# C4C Campus API Reference

This document provides a high-level overview of the API endpoints, their purposes, and how they fit into the system. It's a map of what exists, not detailed request/response documentation.

## API Design Principles

### Response Format
All API endpoints return a consistent structure:

```typescript
{
  data: T | null,
  error: {
    code: string,      // e.g., "UNAUTHORIZED", "NOT_FOUND"
    message: string,   // Human-readable description
    details?: any      // Optional additional context
  } | null
}
```

### Authentication
- Most endpoints require authentication
- Auth token extracted from cookies by middleware
- Role checked against `applications.role`

### Rate Limiting
Built-in rate limiting with presets:
- Auth endpoints: 5 requests per 15 minutes
- Form submissions: 5 per minute
- General API: 60 per minute
- Expensive operations: 10 per hour

## Endpoint Categories

### Public Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/apply` | POST | Submit program application |
| `/api/contact` | POST | Submit contact form |

### Cohort Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cohorts` | GET | List cohorts (with filters) |
| `/api/cohorts` | POST | Create new cohort (teacher/admin) |
| `/api/cohorts/[id]` | GET | Get cohort details |
| `/api/cohorts/[id]` | PUT | Update cohort settings |
| `/api/enroll-cohort` | POST | Enroll current user in cohort |

### Course Enrollment

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enroll` | POST | Enroll in course (legacy) |

### Quiz System

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quizzes` | GET | List quizzes for a course |
| `/api/quizzes` | POST | Create quiz (teacher) |
| `/api/quizzes/[id]` | GET | Get quiz with questions |
| `/api/quizzes/[id]/attempts/[attemptId]` | GET | Get attempt details |
| `/api/quizzes/[id]/attempts/[attemptId]/submit` | POST | Submit quiz answers |

### Assignment System

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/assignments` | GET | List assignments |
| `/api/assignments` | POST | Create assignment (teacher) |
| `/api/assignments/[id]` | GET | Get assignment details |
| `/api/assignments/[id]` | PUT | Update assignment |
| `/api/assignments/[id]` | DELETE | Delete assignment |

### Discussion System

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/discussions` | GET | List discussions |
| `/api/discussions` | POST | Create discussion thread |

### Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/assign-reviewer` | POST | Assign application reviewer |
| `/api/admin/reviewers` | GET | List available reviewers |
| `/api/admin/update-application-status` | POST | Approve/reject application |

### Teacher Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/teacher/cohort-analytics` | GET | Get cohort performance data |

### Supporting Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/users/search` | GET | Search users by name/email |
| `/api/content/media` | POST | Upload media files |
| `/api/submissions/[id]/download` | GET | Download submission file |

## Endpoint Organization

```
/api/
├── apply.ts                     # Public: User registration
├── contact.ts                   # Public: Contact form
│
├── enroll.ts                    # Auth: Course enrollment
├── enroll-cohort.ts             # Auth: Cohort enrollment
├── cohorts.ts                   # Auth: Cohort listing
│
├── admin/                       # Admin-only operations
│   ├── assign-reviewer.ts
│   ├── reviewers.ts
│   └── update-application-status.ts
│
├── assignments/                 # Assignment CRUD + submissions
│   ├── index.ts
│   └── [id].ts
│
├── cohorts/                     # Cohort management
│   └── [id]/
│       ├── enroll.ts
│       └── schedule.ts
│
├── quizzes/                     # Quiz system
│   ├── index.ts
│   └── [id]/
│       └── attempts/
│           └── [attemptId]/
│               ├── index.ts
│               └── submit.ts
│
├── discussions/                 # Forum system
│   └── [id]/
│       ├── reply.ts
│       └── moderate.ts
│
├── teacher/                     # Teacher-specific
│   └── cohort-analytics.ts
│
├── users/                       # User operations
│   └── search.ts
│
├── submissions/                 # File downloads
│   └── [id]/download.ts
│
└── content/                     # Media management
    └── media.ts
```

## Common Patterns

### Authorization Flow

```
Request arrives
    │
    ▼
Middleware checks auth cookie
    │
    ├── No cookie → 401 Unauthorized
    │
    └── Has cookie → Verify session
        │
        ├── Invalid session → 401
        │
        └── Valid session → Check role
            │
            ├── Admin endpoint + not admin → 403
            ├── Teacher endpoint + not teacher/admin → 403
            │
            └── Authorized → Execute handler
```

### Data Validation

API handlers validate input before database operations:

```
Request body received
    │
    ▼
Validate required fields
    │
    ├── Missing → 400 Bad Request
    │
    └── Present → Sanitize input
        │
        ▼
    Type coercion (string IDs → numbers where needed)
        │
        ├── Invalid → 400 Bad Request
        │
        └── Valid → Proceed to database
```

### Error Handling

```
Database operation
    │
    ├── Connection error → 500 Internal Server Error
    │
    ├── Constraint violation → 400/409 with specific message
    │
    ├── Not found → 404 Not Found
    │
    └── Success → 200/201 with data
```

## Key Workflows

### Application Submission (`/api/apply`)

1. Validate form fields (name, email, program, etc.)
2. Create Supabase auth user (email/password)
3. Create `applications` record with `status: 'pending'`
4. Send confirmation email via Resend
5. Return success response

### Cohort Enrollment (`/api/enroll-cohort`)

1. Verify user is authenticated
2. Check cohort exists and is `upcoming` or `active`
3. Check user not already enrolled
4. Check capacity (`current_count < max_students`)
5. Create `cohort_enrollments` record
6. Create legacy `enrollments` record
7. Return enrollment confirmation

### Quiz Submission (`/api/quizzes/[id]/attempts/[attemptId]/submit`)

1. Verify user owns this attempt
2. Verify attempt not already submitted
3. Validate answers format
4. Auto-grade objective questions (multiple choice, true/false)
5. Calculate score and pass/fail
6. Update `quiz_attempts` record
7. Return results

### Assignment Submission (via file upload)

1. Verify user is enrolled in course
2. Check assignment is published
3. Check deadline (allow late if configured)
4. Check submission count < max_submissions
5. Upload file to Supabase Storage (private bucket)
6. Create `assignment_submissions` record
7. Notify teacher via email
8. Return submission confirmation

## Utility Libraries

API endpoints use shared utilities from `/src/lib/`:

| Library | Purpose |
|---------|---------|
| `api-handlers.ts` | Input validation, enrollment checks, progress calculation |
| `security.ts` | XSS sanitization, SQL injection detection, CSRF tokens |
| `time-gating.ts` | Check module unlock status for cohorts |
| `quiz-grading.ts` | Auto-grade quiz answers |
| `file-upload.ts` | Supabase Storage uploads with validation |
| `email-notifications.ts` | Send transactional emails |
| `rate-limiter.ts` | Request rate limiting |

## Testing

Integration tests exist in `/tests/integration/`:
- `cohort-enrollment.test.ts`
- `course-creation.test.ts`
- `video-progress.test.ts`
- `schema-code-alignment.test.ts`

Run with:
```bash
npm run test:integration
```
