# CLAUDE.md - AI Development Guidelines for C4C Campus

## Critical Rules

### The Schema is Immutable

**`schema.sql` is the absolute, immutable source of truth for all data in this codebase.**

The database schema CANNOT be changed, modified, edited, or altered in any way. It is set in stone. When working on this codebase:

1. **NEVER suggest changes to `schema.sql`** - The schema is final and unchangeable
2. **NEVER propose new columns, tables, or modifications** to the database structure
3. **NEVER create migration files** that would alter the schema
4. **ALL code must conform to the existing schema** - not the other way around

If you encounter a situation where schema changes seem necessary, you must find a workaround within the existing structure. The schema defines reality; code must adapt to it.

### Defensive Programming Required

The site is predominantly working but contains bugs. When debugging or implementing fixes:

1. **Do not introduce breaking changes** - Every fix must be backward compatible
2. **Preserve existing functionality** - A bug fix should never break something else
3. **Test assumptions** - Never assume code paths work; verify them
4. **Handle edge cases** - Always consider null, undefined, empty arrays, and missing data
5. **Fail gracefully** - Errors should be caught and handled, never crash the user experience

## Schema Reference

### Core Tables (34 total)

The schema defines these table categories:

- **Authentication**: `applications`, `profiles`, `auth_logs`
- **Course Structure**: `courses`, `modules`, `lessons`
- **Cohort System**: `cohorts`, `cohort_enrollments`, `cohort_schedules`, `enrollments`, `lesson_progress`
- **Discussions**: `lesson_discussions`, `course_forums`, `forum_replies`
- **Assessments**: `quizzes`, `quiz_questions`, `quiz_attempts`, `assignments`, `assignment_rubrics`, `assignment_submissions`
- **Messaging**: `message_threads`, `messages`, `notifications`, `announcements`
- **AI Assistant**: `ai_conversations`, `ai_messages`, `ai_usage_logs`
- **Certificates**: `certificates`, `certificate_templates`
- **Payments**: `payments`, `subscriptions`
- **Media & Analytics**: `media_library`, `analytics_events`

### Key Schema Conventions

#### ID Types
- **UUID (string)**: `cohorts.id`, `quiz_attempts.id`, `assignment_submissions.id`, `applications.id`, most UUID primary keys
- **BIGSERIAL (number)**: `courses.id`, `modules.id`, `lessons.id`, `enrollments.id`, `lesson_progress.id`

Never confuse these. Always use the correct type:
```typescript
// CORRECT
const cohortId: string = "550e8400-e29b-41d4-a716-446655440000";
const courseId: number = 1;

// WRONG - will cause runtime errors
const cohortId: number = 1; // cohort IDs are UUIDs (strings)
```

#### Field Naming
- **Database**: snake_case (`user_id`, `created_at`, `max_students`)
- **TypeScript**: snake_case (matching database via generated types)
- **Never use camelCase in database queries**

```typescript
// CORRECT
.select('user_id, course_id')
.eq('created_at', date)

// WRONG - will fail
.select('userId, courseId')
.eq('createdAt', date)
```

#### Nullable Fields
Match the schema exactly:
- `cohort_id` in `lesson_progress` and `enrollments` is nullable (SET NULL on delete)
- `cohort_id` in `cohort_enrollments` and `cohort_schedules` is NOT NULL (CASCADE delete)

#### CHECK Constraints
TypeScript unions must match database constraints exactly:
```typescript
// Must match: CHECK (status IN ('active', 'completed', 'dropped', 'paused'))
type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'paused';

// Must match: CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'multiple_select'))
type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'multiple_select';
```

## Type System

### Generated Types
`src/types/generated.ts` is auto-generated from the database. **NEVER edit this file manually.**

```typescript
// Import types from generated.ts
import type { CourseRow, CohortRow, QuizAttemptRow } from './generated';
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

## Debugging Guidelines

### Before Making Changes

1. **Read the relevant code first** - Understand what exists before modifying
2. **Check the schema** - Verify column names, types, and constraints
3. **Run type checking** - `npx astro check` before and after changes
4. **Run validation** - `npm run db:validate:all` to check schema-code sync

### Safe Bug Fixing

1. **Isolate the problem** - Identify the exact location of the bug
2. **Understand the impact** - What else depends on this code?
3. **Make minimal changes** - Fix only what's broken
4. **Add defensive checks** - Handle edge cases the original code missed
5. **Test thoroughly** - Verify the fix works and nothing else broke

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

### What NOT to Do

1. **Don't refactor while fixing bugs** - Stay focused on the issue
2. **Don't add features during bug fixes** - Scope creep causes regressions
3. **Don't remove "unnecessary" null checks** - They're probably there for a reason
4. **Don't change API response structures** - Existing clients depend on them
5. **Don't modify shared utilities** without understanding all usages

## API Guidelines

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

### Error Handling
```typescript
// Always return structured errors
if (!userId) {
  return new Response(JSON.stringify({
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
  }), { status: 401 });
}
```

## Validation Commands

Run these before committing changes:

```bash
# Type check
npx astro check

# Schema-types sync
npm run db:types:check

# Field name validation
npm run db:field-names:check

# All validation
npm run db:validate:all

# Integration tests
npm run test:integration
```

## File Organization

```
src/
├── components/     # React islands — see src/components/CLAUDE.md
│   ├── analytics/  # D3 charts — see src/components/analytics/CLAUDE.md
│   ├── certificates/ # Certificate card — see src/components/certificates/CLAUDE.md
│   ├── course/     # Course UI — see src/components/course/CLAUDE.md
│   ├── payments/   # Pricing table — see src/components/payments/CLAUDE.md
│   ├── search/     # Search UI — see src/components/search/CLAUDE.md
│   ├── student/    # Student widgets — see src/components/student/CLAUDE.md
│   └── teacher/    # Teacher tools — see src/components/teacher/CLAUDE.md
├── layouts/        # Astro layouts — see src/layouts/CLAUDE.md
├── lib/            # Shared utilities — see src/lib/CLAUDE.md
├── middleware/     # Request pipeline — see src/middleware/CLAUDE.md
├── pages/          # Astro pages — see src/pages/CLAUDE.md
│   └── api/        # API endpoints — see src/pages/api/CLAUDE.md
├── styles/         # global.css
└── types/          # TypeScript types — see src/types/CLAUDE.md
    ├── generated.ts  # Auto-generated (DO NOT EDIT)
    └── index.ts      # Application types
migrations/         # Incremental SQL migrations — see migrations/CLAUDE.md
scripts/            # Dev/maintenance scripts — see scripts/CLAUDE.md
tests/              # Test suite — see tests/CLAUDE.md
```

## Key Files

- `schema.sql` - **IMMUTABLE** database schema (source of truth)
- `src/types/generated.ts` - Auto-generated types (DO NOT EDIT)
- `src/types/index.ts` - Application-level type definitions
- `src/lib/auth.ts` - JWT verification, cookie parsing, role checks (used everywhere)
- `src/lib/api-handlers.ts` - Course validation utilities
- `src/lib/time-gating.ts` - Cohort schedule / module unlock logic
- `src/middleware/auth.ts` - Server-side route protection (runs before pages render)
- `astro.config.mjs` - Astro configuration (adapters, integrations)

## Summary

1. **Schema is immutable** - Never change it, always adapt code to it
2. **Be defensive** - Handle nulls, validate inputs, catch errors
3. **Don't break things** - Every change must be backward compatible
4. **Match types exactly** - UUID vs BIGSERIAL, snake_case everywhere
5. **Validate before committing** - Run type checks and tests

---

## Organizational Context

**Layer:** 1 | **Lever:** Strengthen | **Integration:** Standalone (links to platform)

This is the Code for Compassion Campus public website — the developer recruitment funnel for the Layer 1 pipeline. This is the first thing prospective bootcamp and Guild developers see. It is important for India community recruitment (Bengaluru + Mumbai launch, May 2026).

**Last updated:** 2026-04-02

**Relevant strategy documents:**
- `programs/developer-training-pipeline/india-community/community-strategy.md` — India launch strategy
- `programs/developer-training-pipeline/guild/operations.md` — Guild pipeline this site feeds
- `roadmap/sprint-plan.md` — May 2026 launch deadline; 20 resident developers onboard

**Current status:** The C4C campus site recruits developers into the pipeline. May 2026 hard deadline for Resident Developer cohort. The platform at `open-paws-platform` is where enrolled developers actually work — this site is the funnel to it.

## Development Standards (Updated 2026-04-02)

### 10-Point Review Checklist (ranked by AI violation frequency)

1. **DRY** — AI clones code at 4x the human rate. Search before writing anything new
2. **Deep modules** — Reject shallow wrappers and pass-through methods. Interface must be simpler than implementation
3. **Single responsibility** — Each function does one thing at one level of abstraction
4. **Error handling** — Never catch-all. AI suppresses errors and removes safety checks. Every catch block must handle specifically
5. **Information hiding** — Don't expose internal state. Mask API keys (last 4 chars only)
6. **Ubiquitous language** — Use movement terminology consistently. Never let AI invent synonyms for domain terms
7. **Design for change** — Abstraction layers and loose coupling
8. **Legacy velocity** — AI code churns 2x faster. Use characterization tests before modifying existing code
9. **Over-patterning** — Simplest structure that works. Three similar lines of code is better than a premature abstraction
10. **Test quality** — Every test must fail when the covered behavior breaks. Mutation score over coverage percentage

### Quality Gates

- **Desloppify:** `desloppify scan --path .` — minimum score ≥85 (web app; platform repos: ≥90)
- **Speciesist language:** `semgrep --config semgrep-no-animal-violence.yaml` on all code/docs edits
- **TypeScript:** Always run `npx astro check` before pushing. Fix all type errors.
- **Schema:** Run `npm run db:validate:all` before any commit touching database code.
- **Two-failure rule:** After two failed fixes on the same problem, stop and restart with a better approach

### Playwright MCP Persona-Based QA

This is a web app. Use Playwright MCP for persona-based browser testing with these personas:

1. **Prospective bootcamp student (India)** — Found the site via university outreach. Can they understand what Code for Compassion is, find the application process, and apply in under 5 minutes on a mid-range device?
2. **Developer evaluating Guild** — Already has coding skills, looking for a community project. Can they understand the Guild structure, quest system, and progression without clicking into the platform?
3. **Teacher/org admin reviewing the campus** — Evaluating C4C as a training program for their staff. Can they find curriculum details, cohort structure, and contact information?

For each persona: test the critical flow, verify light and dark mode rendering, check accessibility (keyboard navigation, contrast, screen reader labels). Run Playwright tests sequentially.

### Seven Concerns — Critical for This Repo

All 7 concerns apply. Highlighted critical ones:

- **Accessibility** (critical) — This is the India recruitment funnel. Must work on low-end Android devices, 3G connections, and with screen readers. Internationalization is coming — do not bake in English-only assumptions.
- **Privacy** — Application form collects personal data. Supabase RLS must be enforced on `applications` table.
- **Security** — Supabase RLS policies on all tables (check `npm run db:validate:all`).
- **Advocacy domain** — The campus is the movement's developer recruitment front. All copy must use movement terminology and be free of speciesist idioms.
- **Emotional safety** — The site introduces new developers to the movement. Apply progressive disclosure for any advocacy content (investigation statistics, graphic content).

### Advocacy Domain Language

Never introduce synonyms for:
- **Campaign** — organized advocacy effort
- **Activist** — person engaged in advocacy work (not "user" or "member" in advocacy contexts)
- **Guild** — the developer community (not "community" or "team")
- **Farmed animal** — not "livestock" in any campus copy

### Structured Coding Reference

For tool-specific AI coding instructions (Claude Code rules, Cursor MDC, Copilot, Windsurf, etc.), copy the corresponding directory from `structured-coding-with-ai` into this project root.
