# src/lib — Shared Utilities and Server Helpers

## Purpose

Shared modules used across API routes, middleware, and components. Covers authentication, Supabase client setup, security primitives, caching, rate limiting, quiz grading, time-gating, email, file upload, notifications, logging, and third-party integrations (OpenRouter, Resend).

## Files

| File | Description |
|------|-------------|
| `auth.ts` | **Central auth module.** JWT verification via JWKS (`jose` library, Supabase endpoint), cookie parsing for multiple token formats (raw JSON, base64, URL-encoded, array). Exports: `verifyJWT`, `extractAccessToken`, `authenticateRequest` (combined token+verify for API routes), `createServiceClient` (service-role Supabase client), `verifyTeacherOrAdminAccess`, `verifyAdminAccess`. |
| `supabase.ts` | Browser-side Supabase client singleton. Configures dual-storage (localStorage + cookies) for session persistence so server middleware can read the auth cookie. 7-day session expiry, SameSite=Lax, Secure in production. |
| `security.ts` | Input validation and HTML sanitization. Exports: `isValidEmail`, `isValidUUID`, `isValidSlug`, `isValidURL`, `isValidInteger`, `isValidLength`, `sanitizeHTML` (via `sanitize-html`), `stripHTML`, `validateRequest` (rule-based validator), `getSecurityHeaders` (HTTP security header map). |
| `api-handlers.ts` | Course-specific validation utilities. Exports: `validateCourseInput` (sanitizes title, description, track, difficulty, slug), `checkEnrollment`, `getCourseProgress`. Defines `VALID_TRACKS` and `VALID_DIFFICULTIES` constants matching schema CHECK constraints. |
| `rate-limiter.ts` | In-memory sliding-window rate limiter. Exports: `RateLimiter` class, `RateLimitPresets` (auth: 5/15min, forms: 5/min, api: 60/min, read: 120/min, expensive: 10/hr), `rateLimit` helper for API routes. |
| `rate-limit.ts` | Purpose unclear — may be an earlier/alternative rate-limiting implementation. Check for duplication with `rate-limiter.ts` before modifying either. |
| `time-gating.ts` | Cohort module unlock logic. All dates are normalized to UTC midnight for DATE-type comparisons. Exports: `isModuleUnlocked` (queries `cohort_schedules`), `getLessonAccess` (checks enrollment + module unlock). Returns structured `ModuleUnlockStatus` and `LessonAccessStatus` with reason codes. |
| `quiz-grading.ts` | Quiz scoring engine. Exports: `gradeQuiz` (auto-grades multiple_choice, true_false, multiple_select; flags short_answer/essay as needs_review), `validateQuiz` (structure validation), `checkQuizAvailability` (enrollment, attempt limits, date windows). All types exported for use in API routes. |
| `assignment-status.ts` | Derives display state for assignments from raw DB data. Exports `calculateAssignmentStatus` returning `AssignmentStatus` (isPastDue, isClosed, canSubmit, canResubmit, statusLabel, etc.). Centralizes badge/label logic used across student and teacher views. |
| `email-notifications.ts` | Transactional email via Resend. FROM address: `C4C Campus <notifications@updates.codeforcompassion.com>`. Functions: `sendApplicationReceivedEmail`, `sendApplicationStatusEmail`, `sendAssignmentSubmittedEmail`, `sendAssignmentGradedEmail`, `sendEnrollmentConfirmationEmail`. |
| `notifications.ts` | Client-side toast notification system. DOM-based (no React dependency). Exports: `showToast(message, type, duration)`. Types: success, error, warning, info. Uses a fixed container appended to `document.body`. |
| `realtime.ts` | Supabase Realtime subscription manager. Exports `MessagingRealtimeManager` class with `subscribeToInbox`, `subscribeToThread`, `unsubscribe`, `unsubscribeAll`. Prevents duplicate channel registration. |
| `file-upload.ts` | Supabase Storage upload/download helpers. Exports: `validateFile` (size + MIME type), `uploadAssignmentFile`, `getDownloadUrl`. Uses the browser-side Supabase client. |
| `openrouter.ts` | OpenRouter Management API wrapper. Provisions, reads, and deletes per-student API keys with weekly spending limits. Exports: `createStudentKey`, `getStudentKeyStatus`, `deleteStudentKey`. Server-only — requires `OPENROUTER_MANAGEMENT_KEY`. |
| `password-validation.ts` | Password strength validation. Used in the application flow (`/api/apply.ts`). |
| `escape-html.ts` | HTML escaping utility. Likely a thin wrapper; check for duplication with `security.ts` `sanitizeHTML`/`stripHTML`. |
| `toast.ts` | Purpose unclear — may overlap with `notifications.ts`. Verify usage before modifying. |
| `utils.ts` | General-purpose helpers (date formatting, string utilities, etc.). |
| `logger.ts` | Structured logging with security event tracking. Exports: `logger` (debug/info/warn/error), `logSecurityEvent(event, meta)`. Outputs formatted `[timestamp] [LEVEL] message {meta}` lines. |
| `cache.ts` | HTTP cache header generators. Exports: `getCacheHeaders(maxAge, staleWhileRevalidate)`, `getNoCacheHeaders()`. Used by `middleware/cache-middleware.ts`. |

## Key Patterns

- **Fail-closed auth:** `authenticateRequest` and `verifyJWT` return `null`/Response on any failure — never pass invalid tokens
- **Service client pattern:** `createServiceClient()` bypasses RLS and should only be called AFTER JWT is verified
- **Schema type alignment:** `VALID_TRACKS`, `VALID_DIFFICULTIES`, enum types in `quiz-grading.ts` must match `schema.sql` CHECK constraints exactly
- **Two rate-limit files:** `rate-limit.ts` and `rate-limiter.ts` — verify which one is canonical before adding new endpoints

## Cross-References

- `src/middleware/auth.ts` — imports `verifyJWT`, `extractAccessToken`, `logSecurityEvent`
- `src/middleware/cache-middleware.ts` — imports `getCacheHeaders`, `getNoCacheHeaders`
- `src/pages/api/*` — most API routes import `authenticateRequest`, `createServiceClient` from `auth.ts`
- `src/types/` — quiz, assignment, messaging types align with lib modules
