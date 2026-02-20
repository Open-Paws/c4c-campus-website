# AGENTS.md — Complete Agent Guide for C4C Campus

> This is the **single source of truth** for AI agents working in this codebase.
> Read this file before making any changes.

---

## 1. Critical Rules

### The Schema is Immutable

**`schema.sql` is the absolute, immutable source of truth for all data in this codebase.**

The database schema CANNOT be changed, modified, edited, or altered in any way. It is set in stone:

1. **NEVER suggest changes to `schema.sql`** — The schema is final and unchangeable
2. **NEVER propose new columns, tables, or modifications** to the database structure
3. **NEVER create migration files** that would alter the schema
4. **ALL code must conform to the existing schema** — not the other way around

If you encounter a situation where schema changes seem necessary, you must find a workaround within the existing structure. The schema defines reality; code must adapt to it.

### Defensive Programming Required

The site is predominantly working but contains bugs. When debugging or implementing fixes:

1. **Do not introduce breaking changes** — Every fix must be backward compatible
2. **Preserve existing functionality** — A bug fix should never break something else
3. **Test assumptions** — Never assume code paths work; verify them
4. **Handle edge cases** — Always consider null, undefined, empty arrays, and missing data
5. **Fail gracefully** — Errors should be caught and handled, never crash the user experience

### What NOT to Do

1. **Don't refactor while fixing bugs** — Stay focused on the issue
2. **Don't add features during bug fixes** — Scope creep causes regressions
3. **Don't remove "unnecessary" null checks** — They're probably there for a reason
4. **Don't change API response structures** — Existing clients depend on them
5. **Don't modify shared utilities** without understanding all usages

### Validation Commands

Run these before committing changes:

```bash
npx astro check              # Type check
npm run db:types:check        # Schema-types sync
npm run db:field-names:check  # Field name validation
npm run db:validate:all       # All validation
npm run test:integration      # Integration tests
```

---

## 2. Project Overview

**C4C Campus** is a full-featured Learning Management System (LMS) for Coding for Change, focused
on animal advocacy, climate action, and AI safety education tracks.

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5.x SSR (server-rendered, not static) |
| Hosting | Vercel (serverless functions + edge) |
| UI Islands | React 19 (`client:only="react"` or `client:load`) |
| Styling | Tailwind CSS v4 with CSS custom properties design system |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Auth | JWT verification via `jose` / JWKS (not Supabase client auth on server) |
| AI Features | OpenRouter Management API for per-student API key provisioning |
| Email | Resend API |
| Payments | Stripe (optional) |

### Key Architectural Decisions

- **SSR-only deployment** — No static site generation. Every page renders on the server via the Vercel adapter.
- **Astro islands architecture** — Pages are `.astro` files. Interactive components are React islands hydrated client-side.
- **Content lives in the database**, not in Astro content collections. Courses, lessons, modules are all DB-driven.
- **Two Supabase client patterns** exist (see Section 6).
- **No global state manager** — React components use `useState`/`useEffect`/`useCallback` locally.

---

## 3. Project Structure

```
c4c_website/
├── AGENTS.md                  # This file — the complete agent reference
├── schema.sql                 # IMMUTABLE database schema (source of truth)
├── astro.config.mjs           # Astro + Vercel SSR config
├── tailwind.config.mjs        # Tailwind v4 config
├── vitest.config.ts           # Unit test config (jsdom)
├── vitest.integration.config.ts # Integration test config (node, real DB)
├── playwright.config.ts       # E2E test config (6 browser/device combos)
├── .env.example               # All environment variables documented
├── src/
│   ├── middleware/             # Request pipeline (auth, security, caching)
│   │   ├── index.ts           # Sequence: perf → cors → auth → cache → security
│   │   ├── auth.ts            # Route protection (admin/teacher/dashboard)
│   │   ├── security.ts        # Additional security checks
│   │   └── cache-middleware.ts # CORS, caching, compression
│   ├── lib/                   # Shared server/client utilities
│   │   ├── auth.ts            # JWT verification (jose/JWKS), token extraction
│   │   ├── supabase.ts        # Supabase client (anon key, client-side)
│   │   ├── api-handlers.ts    # API helper patterns
│   │   ├── openrouter.ts      # OpenRouter Management API wrapper
│   │   ├── rate-limit.ts      # Server-side rate limiting
│   │   ├── rate-limiter.ts    # Client-side rate limiting
│   │   ├── security.ts        # CSRF, input sanitization, XSS prevention
│   │   ├── escape-html.ts     # HTML escaping utility
│   │   ├── time-gating.ts     # Cohort schedule / module unlock logic
│   │   ├── assignment-status.ts # Assignment state machine
│   │   ├── email-notifications.ts # Resend email integration
│   │   ├── quiz-grading.ts    # Quiz auto-grading logic
│   │   ├── file-upload.ts     # Supabase Storage upload helpers
│   │   ├── logger.ts          # Structured logging + security event logging
│   │   ├── cache.ts           # In-memory caching
│   │   ├── toast.ts           # Client-side toast notifications
│   │   └── utils.ts           # General utilities
│   ├── types/
│   │   ├── generated.ts       # AUTO-GENERATED from schema (NEVER edit)
│   │   └── index.ts           # Application-level types extending generated
│   ├── pages/                 # Astro pages + API routes
│   │   ├── api/               # 40+ API endpoints (see Section 7)
│   │   ├── admin/             # Admin pages
│   │   ├── teacher/           # Teacher pages
│   │   ├── dashboard.astro    # Student dashboard
│   │   ├── courses/           # Course browsing & detail pages
│   │   ├── assignments/       # Assignment list & submission pages
│   │   └── ...
│   ├── components/            # React components (islands)
│   │   ├── student/           # Student-facing widgets
│   │   ├── teacher/           # Teacher tools
│   │   ├── course/            # Course display components
│   │   ├── analytics/         # Dashboard charts and metrics
│   │   ├── search/            # Search UI components
│   │   ├── certificates/      # Certificate generation
│   │   ├── payments/          # Stripe integration
│   │   └── *.tsx              # Shared components (root level)
│   ├── layouts/               # Astro layout templates
│   └── styles/                # Global CSS / Tailwind base
├── tests/
│   ├── unit/                  # Vitest + jsdom (fast, isolated)
│   ├── integration/           # Vitest + real Supabase DB (sequential)
│   ├── security/              # File upload security, malware scanning
│   ├── e2e/                   # Playwright browser tests
│   └── fixtures/              # Shared test data
├── scripts/                   # DB validation, type generation, migrations
└── public/                    # Static assets
```

### Key Files

- `schema.sql` — **IMMUTABLE** database schema (source of truth)
- `src/types/generated.ts` — Auto-generated types (DO NOT EDIT)
- `src/types/index.ts` — Application-level type definitions
- `src/lib/auth.ts` — JWT verification, token extraction, role checks
- `src/lib/api-handlers.ts` — API utility functions
- `src/lib/time-gating.ts` — Cohort schedule logic

---

## 4. Database Architecture

### Schema Overview (34 tables)

The schema is defined in `schema.sql` and is **immutable** (see Section 1).

**Table categories:**
- **Auth & Profiles:** `applications`, `profiles`, `auth_logs`
- **Course Structure:** `courses`, `modules`, `lessons`
- **Cohort System:** `cohorts`, `cohort_enrollments`, `cohort_schedules`, `enrollments`, `lesson_progress`
- **Discussions:** `lesson_discussions`, `course_forums`, `forum_replies`
- **Assessments:** `quizzes`, `quiz_questions`, `quiz_attempts`, `assignments`, `assignment_rubrics`, `assignment_submissions`
- **Messaging:** `message_threads`, `messages`, `notifications`, `announcements`
- **AI:** `ai_conversations`, `ai_messages`, `ai_usage_logs`
- **Certificates:** `certificates`, `certificate_templates`
- **Payments:** `payments`, `subscriptions`
- **Media & Analytics:** `media_library`, `analytics_events`

### ID Types (Critical — Do Not Confuse)

| Type | Tables | TypeScript Type |
|------|--------|----------------|
| UUID (string) | `cohorts`, `quiz_attempts`, `assignment_submissions`, `applications`, most junction tables | `string` |
| BIGSERIAL (number) | `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress` | `number` |

```typescript
// CORRECT
const cohortId: string = "550e8400-e29b-41d4-a716-446655440000";
const courseId: number = 1;

// WRONG - will cause runtime errors
const cohortId: number = 1; // cohort IDs are UUIDs (strings)
```

### Field Naming

- **Database**: snake_case (`user_id`, `created_at`, `max_students`)
- **TypeScript**: snake_case (matching database via generated types)
- **Never use camelCase in database queries**

```typescript
// CORRECT
.select('user_id, course_id')
.eq('created_at', date)

// WRONG - will fail silently or error
.select('userId, courseId')
.eq('createdAt', date)
```

### Nullable Fields

Match the schema exactly:
- `cohort_id` in `lesson_progress` and `enrollments` is nullable (SET NULL on delete)
- `cohort_id` in `cohort_enrollments` and `cohort_schedules` is NOT NULL (CASCADE delete)

### CHECK Constraints

TypeScript unions must match database constraints exactly:
```typescript
// Must match: CHECK (status IN ('active', 'completed', 'dropped', 'paused'))
type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'paused';

// Must match: CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'multiple_select'))
type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'multiple_select';
```

### Key Patterns

- **JSONB columns** are used for flexible data: `profiles.preferences`, `quiz_questions.options`, `quiz_attempts.answers`
- **Soft deletes** don't exist — rows are hard-deleted or status-changed
- **All timestamps** are `timestamptz` with `DEFAULT now()`
- **Cohort isolation** — Most student data is scoped to a cohort via foreign keys
- **Row-Level Security (RLS)** — 50+ policies enforce access control at the database level

### Important Database Functions

```sql
enroll_in_cohort()          -- Atomic enrollment with row locking (prevents race conditions)
create_assignment_submission() -- Atomic submission creation
check_enrollment_status()   -- Validates enrollment before operations
get_course_progress()       -- Calculates completion percentage
```

---

## 5. Type System

### Generated Types

`src/types/generated.ts` is auto-generated from the database. **NEVER edit this file manually.**

```typescript
// Import types from generated.ts
import type { CourseRow, CohortRow, QuizAttemptRow } from './generated';
```

Run these to manage types:
```bash
npm run db:types:generate    # Regenerate types from schema
npm run db:types:check       # Verify types match schema
npm run db:field-names:check # Verify snake_case field naming
npm run db:validate:all      # Run all validation checks
```

### Custom Types

`src/types/index.ts` contains application-level types that extend generated types:

```typescript
// Example: Course with stricter non-null constraints
export interface Course extends Omit<CourseRow, 'track' | 'difficulty' | 'created_by'> {
  track: 'animal_advocacy' | 'climate' | 'ai_safety' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_by: string;
}
```

---

## 6. Authentication & Authorization

### Architecture

Authentication uses a **two-layer approach**:

1. **Supabase Auth** handles user registration, login, password reset, and session management
2. **Server-side JWT verification** via `jose` / JWKS validates tokens independently of the Supabase client

### Why Independent JWT Verification?

API routes that use the **service role key** bypass RLS (and thus bypass PostgREST's built-in JWT check). The `jose`-based verification in `src/lib/auth.ts` ensures forged tokens cannot access these privileged endpoints.

### Token Flow

```
Client → Cookie (sb-*-auth-token) → Server extracts token → jose verifyJWT() → Claims {sub, email, exp}
```

The token extraction in `extractAccessToken()` handles multiple cookie format variants: raw JSON, base64-encoded, URL-encoded, array format, and `base64-` prefixed values.

### Roles

| Role | Access | Route Pattern |
|------|--------|--------------|
| `admin` | Full system access | `/admin/*` |
| `teacher` | Course management, grading | `/teacher/*` |
| `student` | Dashboard, coursework | `/dashboard`, `/assignments/*` |

Roles are stored in `profiles.role` and checked by middleware (`src/middleware/auth.ts`).

### Middleware Chain

Requests flow through this pipeline (defined in `src/middleware/index.ts`):

```
Performance → CORS → Auth → Static Assets → Cache → Compression → Security Headers
```

- **Auth middleware** protects `/admin/*`, `/teacher/*`, `/dashboard` routes
- **API routes** (`/api/*`) are **skipped by auth middleware** — they handle their own authentication via `authenticateRequest()` or direct JWT verification
- **Security middleware** adds CSP, X-Frame-Options, XSS-Protection headers

### Common Auth Pattern in API Routes

```typescript
import { verifyJWT, extractAccessToken } from '../../lib/auth';

export async function POST({ request }: APIContext) {
  const token = extractAccessToken(request);
  if (!token) return new Response('Unauthorized', { status: 401 });

  const claims = await verifyJWT(token);
  if (!claims) return new Response('Invalid token', { status: 401 });

  const userId = claims.sub;
  // ... use service role client for privileged operations
}
```

### Supabase Client Patterns

| Client | Key | RLS | Usage |
|--------|-----|-----|-------|
| **Anon client** (`src/lib/supabase.ts`) | `PUBLIC_SUPABASE_ANON_KEY` | Enforced | Client-side React components, middleware |
| **Service role client** (created per-request) | `SUPABASE_SERVICE_ROLE_KEY` | Bypassed | Server-side API routes after JWT verification |

```typescript
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
```

**Rule:** Only create service role clients in API routes, and **only after** verifying the user's JWT. Never expose the service role key to the client.

### RLS Policy Patterns

- **Cohort isolation:** Students can only see data within their enrolled cohorts
- **Role-based access:** Teachers see their assigned courses; admins see everything
- **Self-access:** Users can read/update their own profile, submissions, progress

---

## 7. API Routes

### Organization

API routes live in `src/pages/api/` and follow Astro's file-based routing:

```
src/pages/api/
├── admin/          # Admin-only endpoints
│   ├── applications.ts
│   ├── users.ts
│   └── stats.ts
├── ai/             # AI key management
│   ├── provision-key.ts
│   ├── key-status.ts
│   └── regenerate-key.ts
├── assignments/    # Assignment CRUD
├── blog/           # Blog management
├── certificates/   # Certificate generation
├── cohorts/        # Cohort management
├── content/        # Content serving
├── cron/           # Scheduled tasks (CRON_SECRET protected)
├── discussions/    # Forum/discussion endpoints
├── quizzes/        # Quiz submission & grading
├── submissions/    # Assignment submission handling
├── teacher/        # Teacher-specific endpoints
├── users/          # User profile management
├── apply.ts        # Application submission
├── blog.ts         # Blog listing
├── cohorts.ts      # Cohort listing
├── contact.ts      # Contact form
├── discussions.ts  # Discussion listing
├── enroll.ts       # Course enrollment
└── enroll-cohort.ts # Cohort enrollment
```

### Response Format

```typescript
interface APIResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}
```

```typescript
// Success
return new Response(JSON.stringify({ data: result }), { status: 200 });

// Error — always return structured errors
return new Response(JSON.stringify({
  data: null,
  error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
}), { status: 401 });
```

**Common status codes:**
- `200` — Success
- `400` — Bad request / validation error
- `401` — Not authenticated
- `403` — Forbidden (wrong role)
- `404` — Resource not found
- `429` — Rate limited
- `503` — Feature not configured (e.g., missing env vars for optional features)

**Rate limiting:** Both client-side (`src/lib/rate-limiter.ts`) and server-side (`src/lib/rate-limit.ts`) implementations exist. Server-side uses in-memory stores (resets on serverless cold start).

### OpenRouter AI Key Endpoints

These endpoints manage per-student OpenRouter API keys:

- `POST /api/ai/provision-key` — Auto-provisions a key on first dashboard load
- `GET /api/ai/key-status` — Returns usage, limits, disabled status, cooldown info
- `POST /api/ai/regenerate-key` — Regenerates key (24h cooldown enforced via DB)

The cooldown timestamp is stored in `profiles.preferences` JSONB (`last_key_regenerated_at`), which survives serverless restarts.

---

## 8. Debugging Guidelines

### Before Making Changes

1. **Read the relevant code first** — Understand what exists before modifying
2. **Check the schema** — Verify column names, types, and constraints in `schema.sql`
3. **Run type checking** — `npx astro check` before and after changes
4. **Run validation** — `npm run db:validate:all` to check schema-code sync

### Safe Bug Fixing

1. **Isolate the problem** — Identify the exact location of the bug
2. **Understand the impact** — What else depends on this code?
3. **Make minimal changes** — Fix only what's broken
4. **Add defensive checks** — Handle edge cases the original code missed
5. **Test thoroughly** — Verify the fix works and nothing else broke

### Common Bug Patterns

#### Null/Undefined Handling
```typescript
// DEFENSIVE: Always check for null/undefined
const cohortId = enrollment?.cohort_id ?? null;
const lessons = modules?.flatMap(m => m.lessons ?? []) ?? [];
const progress = enrollment?.progress?.completed_lessons ?? 0;
```

#### Type Coercion
```typescript
// DEFENSIVE: Parse IDs correctly
const courseId = typeof id === 'string' ? parseInt(id, 10) : id;
if (isNaN(courseId)) {
  return { error: 'Invalid course ID' };
}
```

#### Array Safety
```typescript
// DEFENSIVE: Check arrays before operations
if (!Array.isArray(questions) || questions.length === 0) {
  return { error: 'No questions found' };
}
const firstQuestion = questions[0];
```

#### Database Query Safety
```typescript
// DEFENSIVE: Check query results
const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();

if (error) {
  console.error('Database error:', error);
  return { error: 'Failed to fetch course' };
}

if (!data) {
  return { error: 'Course not found' };
}
```

---

## 9. Frontend Architecture

### Astro + React Islands

- **`.astro` files** handle page layout, data fetching, and server-side rendering
- **`.tsx` files** are React islands hydrated on the client for interactivity
- Islands are mounted with `client:only="react"` (no SSR) or `client:load` (SSR + hydrate)

### Component Organization

| Directory | Purpose | Examples |
|-----------|---------|---------|
| `components/student/` | Student dashboard widgets | `AIKeyWidget`, `AssignmentCard`, `SubmissionStatus` |
| `components/teacher/` | Teacher grading/creation tools | `AssignmentGrader`, `SubmissionsList` |
| `components/course/` | Course display | `CourseCard`, `LessonNav`, `VideoPlayer` |
| `components/analytics/` | Data visualization | `D3HeatMap`, `MetricCard`, `ProgressChart` |
| `components/search/` | Search interface | `SearchBar`, `SearchFilters`, `SearchResults` |
| `components/` (root) | Shared components | `DiscussionThread`, `QuizCard`, `Toast`, `NotificationBell` |

### Styling

- **Tailwind CSS v4** with CSS custom properties for theming
- Design tokens defined as CSS variables (colors, spacing, typography)
- Utility classes: `text-text-muted`, `bg-surface`, `border-border` (semantic tokens)
- Component classes: `card`, `btn`, `btn-primary`, `btn-ghost`, `btn-sm`

### Client-Side Data Fetching Pattern

React components fetch data from API routes using `fetch()`:

```typescript
const res = await fetch('/api/ai/key-status');
if (!res.ok) throw new Error(`Failed: ${res.status}`);
const data = await res.json();
```

Authentication is automatic via cookies — the browser sends `sb-*-auth-token` cookies with every request.

---

## 10. Environment Variables

### Required Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key (RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase admin key (bypasses RLS) |
| `RESEND_API_KEY` | Server only | Email sending via Resend |
| `SITE_URL` | Server | Canonical site URL |

### Optional Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `OPENROUTER_PROVISIONING_API_KEY` | Server only | OpenRouter Management API key |
| `PUBLIC_OPENROUTER_STUDENT_WEEKLY_LIMIT` | Client + Server | Weekly spending limit (default: $10) |
| `OPENROUTER_REGEN_COOLDOWN_HOURS` | Server only | Key regen cooldown (default: 24h) |
| `CRON_SECRET` | Server only | Auth token for cron endpoints |
| `PUBLIC_STRIPE_*` / `STRIPE_*` | Mixed | Stripe payment integration |
| `DATABASE_URL` | Local only | Direct DB connection for local scripts |

### Variable Naming Convention

- `PUBLIC_` prefix → available in client-side code (`import.meta.env.PUBLIC_*`)
- No prefix → server-only (available in API routes, middleware, SSR)

### Graceful Degradation

Optional features return `503` when their env vars are missing (e.g., AI endpoints without `OPENROUTER_PROVISIONING_API_KEY`). The UI components check for 503 and hide themselves (`return null`).

---

## 11. Testing

### Three-Tier Test Strategy

#### Unit Tests (fast, isolated)
```bash
npm run test              # Run unit tests
npm run test -- --watch   # Watch mode
```
- Config: `vitest.config.ts`
- Environment: `jsdom`
- Location: `tests/unit/`
- Coverage threshold: 80%
- Tests: API handlers, utility functions, component logic, state machines

#### Integration Tests (real database)
```bash
npm run test:integration  # Run integration tests
```
- Config: `vitest.integration.config.ts`
- Environment: `node` (real Supabase connection)
- Location: `tests/integration/`
- **Runs sequentially** (shared DB state)
- Tests: RLS policies, enrollment flows, cohort logic, schema-code alignment

#### E2E Tests (browser automation)
```bash
npx playwright test       # Run E2E tests
```
- Config: `playwright.config.ts`
- 6 browser/device configurations (Chrome, Firefox, Safari, mobile)
- Location: `tests/e2e/`
- Tests: Student journey, teacher workflow, admin workflow, accessibility, mobile responsive

#### Security Tests
- Location: `tests/security/`
- Tests: File upload validation, malware scanning

### Pre-Commit Hooks (Husky)

- **Schema-types sync** (`npm run db:types:check`) — **Blocking**: commit fails if types don't match schema
- **Field naming check** (`npm run db:field-names:check`) — **Non-blocking**: warns but allows commit

---

## 12. Code Conventions

### Naming

| Context | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase | `AIKeyWidget.tsx`, `CourseCard.tsx` |
| Utility files | kebab-case | `api-handlers.ts`, `time-gating.ts` |
| Functions/variables | camelCase | `fetchStatus()`, `handleRefresh()` |
| Constants | UPPER_SNAKE_CASE | `ADMIN_ROUTES`, `OPENROUTER_BASE_URL` |
| Database fields | snake_case | `user_id`, `created_at` |
| CSS classes | kebab-case (Tailwind) | `text-text-muted`, `btn-primary` |
| Env variables | UPPER_SNAKE_CASE | `SUPABASE_SERVICE_ROLE_KEY` |

### Import Conventions

```typescript
// Path alias: @/* maps to src/*
import { supabase } from '@/lib/supabase';
import type { CourseRow } from '@/types/generated';

// Relative imports also used (both are acceptable)
import { verifyJWT } from '../../lib/auth';
```

### Error Handling Patterns

```typescript
// API routes: structured error responses
return new Response(JSON.stringify({
  error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
}), { status: 400 });

// React components: try/catch with user-facing state
try {
  const res = await fetch('/api/...');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
} catch (err) {
  console.error('[ComponentName] Error:', err);
  setErrorMessage('User-friendly message');
}

// Database queries: always check error AND data
const { data, error } = await supabase.from('table').select('*');
if (error) { /* handle */ }
if (!data) { /* handle */ }
```

### Documentation Style

- JSDoc comments on exported functions and complex logic
- Module-level doc comments (`/** ... */`) at the top of files explaining purpose
- Inline comments for non-obvious business logic only

---

## 13. Common Workflows

### Adding a New API Endpoint

1. Create file in `src/pages/api/` following Astro's file-based routing
2. Export named functions for HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)
3. Add JWT verification using `extractAccessToken()` + `verifyJWT()` from `src/lib/auth.ts`
4. Create service role client for DB operations
5. Return structured JSON responses with appropriate status codes
6. Add rate limiting if the endpoint is user-facing

### Adding a New React Component

1. Create `.tsx` file in the appropriate `src/components/` subdirectory
2. Export a default function component
3. Mount in an `.astro` page with `client:only="react"` or `client:load`
4. Fetch data from API routes using `fetch()` (cookies sent automatically)
5. Use local state (`useState`, `useEffect`) — no global state manager

### Modifying Database Queries

1. **Check `schema.sql`** for exact column names, types, and constraints
2. **Check `src/types/generated.ts`** for TypeScript types
3. Use snake_case in all query builders (`.select('user_id')`, not `.select('userId')`)
4. Handle nullable fields defensively (see Section 8)
5. Run `npm run db:validate:all` after changes

---

## 14. Security Considerations

- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in client-side code
- **Always verify JWT** before using service role client in API routes
- **CSRF tokens** are used for state-changing operations (`src/lib/security.ts`)
- **Input sanitization** via `src/lib/security.ts` and `src/lib/escape-html.ts`
- **File upload validation** includes type checking and malware scanning
- **CSP headers** are set in middleware — update if adding new external script/style sources
- **Rate limiting** exists at both client and server levels
- **RLS policies** are the primary access control mechanism — service role bypasses them, so extra care is needed in API routes

---

## 15. Deployment

- **Platform:** Vercel with SSR adapter
- **Build:** `npm run build` (Astro build with Vercel adapter)
- **Preview:** `npm run preview` (local production-like server)
- **Dev:** `npm run dev` (Astro dev server with HMR)
- **Cron jobs:** Vercel cron calls `/api/cron/*` endpoints with `CRON_SECRET` authentication
- **Environment:** All server-only env vars are set in Vercel dashboard; `PUBLIC_*` vars are embedded at build time
