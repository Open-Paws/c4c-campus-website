# tests — Test Suite

## Purpose

Multi-layer test coverage: unit tests (Vitest), integration tests (Vitest + real Supabase), and end-to-end tests (Playwright). Run with `npm test` (unit), `npm run test:integration` (integration), and `npx playwright test` (e2e).

## Structure

```
tests/
├── unit/           # Unit tests — logic-only, no DB
├── integration/    # Integration tests — require Supabase connection
├── e2e/            # Playwright end-to-end tests
├── components/     # React component tests (Vitest + jsdom)
├── security/       # Security-specific test cases
├── fixtures/       # Shared test data factories
└── (root)          # Miscellaneous integration-style tests
```

## Unit Tests (`tests/unit/`)

| File | What it tests |
|------|---------------|
| `api-handlers.test.ts` | `lib/api-handlers.ts` — course validation, enrollment checks |
| `assignment-status.test.ts` | `lib/assignment-status.ts` — all status derivation branches |
| `certificate-eligibility.test.ts` | Certificate issuance eligibility logic |
| `cohort-analytics.test.ts` | Cohort analytics calculations |
| `discussion-ui.test.ts` | Discussion UI component behavior |
| `progress-dashboard.test.ts` | Progress calculation and dashboard state |
| `quiz-grading.test.ts` | `lib/quiz-grading.ts` — all question types, scoring, pass/fail |
| `student-roster.test.ts` | Student roster display logic |
| `teacher-dashboard.test.ts` | Teacher dashboard data transformations |
| `time-gating.test.ts` | `lib/time-gating.ts` — unlock/lock logic, UTC date normalization |
| `utils.test.ts` | `lib/utils.ts` — general helper functions |

## Component Tests (`tests/components/`)

| File | Component tested |
|------|-----------------|
| `CohortStats.test.tsx` | `CohortStats` |
| `Comment.test.tsx` | `Comment` |
| `CommentInput.test.tsx` | `CommentInput` |
| `CourseBuilder.test.tsx` | `course/CourseBuilder` |
| `CourseCard.test.tsx` | `course/CourseCard` |
| `Leaderboard.test.tsx` | `Leaderboard` |
| `LessonNav.test.tsx` | `course/LessonNav` |
| `ModerationActions.test.tsx` | `ModerationActions` |
| `ProgressBar.test.tsx` | `course/ProgressBar` |
| `StrugglingStudents.test.tsx` | `StrugglingStudents` |
| `StudentRoster.test.tsx` | Student roster (teacher view) |
| `VideoPlayer.test.tsx` | `course/VideoPlayer` |

## Integration Tests (`tests/integration/`)

| File | What it tests |
|------|---------------|
| `admin-tools.test.ts` | Admin API endpoints end-to-end |
| `assignment-submission-api.test.ts` | Full assignment submission flow |
| `cohort-api.test.ts` | Cohort CRUD and enrollment APIs |
| `cohort-enrollment.test.ts` | Enrollment state machine |
| `cohort-schema.test.ts` | Schema-code alignment for cohort tables |
| `course-creation.test.ts` | Course and module creation flow |
| `discussion-api.test.ts` | Discussion and reply APIs |
| `discussion-schema.test.ts` | Schema alignment for discussion tables |
| `enrollment-flow.test.ts` | Full enrollment journey |
| `progress-tracking.test.ts` | Lesson progress recording and calculation |
| `rls-policies.test.ts` | Row-Level Security policy verification |
| `schema-code-alignment.test.ts` | Validates generated types match live schema |
| `time-gating.test.ts` | Time-gating with real Supabase `cohort_schedules` |
| `video-progress.test.ts` | Video watch progress recording |

## E2E Tests (`tests/e2e/`)

| File | Scenario |
|------|----------|
| `student-journey.spec.ts` | Full student flow: login → course → lesson → quiz |
| `teacher-workflow.spec.ts` | Teacher flow: create course → cohort → grade submissions |
| `admin-workflow.spec.ts` | Admin flow: review application → approve → manage cohort |
| `accessibility.spec.ts` | Axe accessibility checks on all major pages |
| `mobile-responsive.spec.ts` | Mobile viewport rendering on key pages |
| `cross-browser.spec.ts` | Chrome, Firefox, Safari parity |
| `performance.spec.ts` | Core Web Vitals baseline checks |
| `error-scenarios.spec.ts` | Error state handling (network failures, auth errors) |

Fixtures: `e2e/fixtures/auth.ts` (auth helpers), `e2e/fixtures/test-data.ts` (seed data), `e2e/helpers/db-setup.ts` (DB setup/teardown).

## Security Tests (`tests/security/`)

| File | What it tests |
|------|---------------|
| `file-upload-security.test.ts` | File type bypass attempts, oversized files |
| `malware-scanner.test.ts` | Malicious file detection on upload |

## Root-Level Tests

| File | What it tests |
|------|---------------|
| `analytics-authentication.test.ts` | Analytics endpoint auth requirements |
| `assignment-submission.test.ts` | Assignment submission integration |
| `content-management.test.ts` | Content CRUD operations |
| `media_library_rls.test.ts` | RLS on media_library table |
| `quiz-student-flow.test.ts` | Quiz start → answer → submit flow |
| `security.test.ts` | General security checks (header presence, input sanitization) |

## Shared Fixtures (`tests/fixtures/`)

| File | Contents |
|------|----------|
| `courses.ts` | Course and module factory functions |
| `enrollments.ts` | Enrollment factory functions |
| `users.ts` | User profile factory functions |

## Key Rules

- Integration tests require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment — do not run against production
- Run integration tests with `vitest.integration.config.ts` (separate config to avoid mixing with unit tests)
- E2E tests run sequentially — do not parallelize (shared browser state)

## Cross-References

- `vitest.config.ts` — unit + component test config
- `vitest.integration.config.ts` — integration test config
- `playwright.config.ts` — e2e test config
- `tests/integration/README_PROGRESS_TRACKING.md` — progress tracking test notes
- `tests/e2e/README.md` — e2e setup and persona documentation
- `tests/e2e/TEST_PLAN.md` — full test plan
- `tests/unit/TEACHER_DASHBOARD_TESTS_README.md` — teacher dashboard test notes
