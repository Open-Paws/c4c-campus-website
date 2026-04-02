# src/components/certificates — Certificate Components

## Purpose

Certificate display for students who complete a course.

## Files

| File | Description |
|------|-------------|
| `CertificateCard.tsx` | Displays an earned certificate with course name, completion date, and a verification link. The verification link resolves to `/verify/[code]`. |

## Cross-References

- `src/pages/certificates/index.astro` — student certificate listing page
- `src/pages/verify/[code].astro` — public certificate verification page
- `src/pages/api/certificates/index.ts` — certificate issuance API
- `src/pages/api/certificates/verify/[code].ts` — verification endpoint
