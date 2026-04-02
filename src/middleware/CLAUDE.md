# src/middleware — Astro Request Pipeline

## Purpose

Server-side middleware stack for all incoming requests. Handles authentication enforcement, caching strategy, security headers, CORS, and performance monitoring. Composed in a fixed sequence via Astro's `sequence()` utility.

**Sequence order:** performance → cors → auth → static assets → cache → compression → security

## Files

| File | Description |
|------|-------------|
| `index.ts` | Middleware entry point. Composes all middleware with `sequence()`. Defines inline `securityMiddleware` (CSP, HSTS, frame options) and `performanceMiddleware` (Server-Timing header, slow-request warning at >1s). Also defines `staticAssetMiddleware` (1-year cache for `/_astro/` and static extensions). |
| `auth.ts` | Route-based auth guard. Protects `/admin/*` (admin role required), `/teacher/*` (teacher or admin), `/dashboard` (any authenticated user). Extracts JWT from Supabase cookie, verifies it via JWKS using `lib/auth.verifyJWT`, queries `applications.role` for role checks, logs security events via `lib/logger.logSecurityEvent`. Public routes listed explicitly as passthrough. |
| `cache-middleware.ts` | HTTP caching for API routes. Exports `cacheMiddleware` (ETag generation, Cache-Control by path strategy), `compressionMiddleware` (ensures Content-Type on API responses), `corsMiddleware` (CORS headers + OPTIONS preflight). Cache strategies: `public` (1hr), `private` (5min), `realtime` (30s), `noCache` (mutations and teacher endpoints). |
| `security.ts` | Thin security middleware that delegates header generation to `lib/security.getSecurityHeaders()`. Skips static assets. **Note:** Security headers are also set inline in `index.ts`; this file is imported but its export is not currently wired into the `sequence()` call — verify usage before modifying. |

## Key Patterns

- Auth middleware fails closed: missing or invalid JWT always redirects to `/login`, never passes through
- Role verification reads from `applications.role` column (not `profiles`) — admin and teacher checks make a DB query per request
- Static asset bypass: both auth middleware and cache middleware skip requests matching static file extensions
- CORS is permissive (`*`) on API routes — tighten if the platform adds private API consumers

## Cross-References

- `src/lib/auth.ts` — `verifyJWT`, `extractAccessToken` used by `auth.ts`
- `src/lib/security.ts` — `getSecurityHeaders` used by `security.ts`
- `src/lib/cache.ts` — `getCacheHeaders`, `getNoCacheHeaders` used by `cache-middleware.ts`
- `src/lib/logger.ts` — `logger`, `logSecurityEvent` used by `auth.ts`
