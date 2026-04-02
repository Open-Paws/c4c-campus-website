# scripts — Development and Maintenance Scripts

## Purpose

Utility scripts for schema validation, type checking, image optimization, and migration management. Run via `npm run` commands defined in `package.json`.

## Files

| File | Command | Description |
|------|---------|-------------|
| `check-schema-types.js` | `npm run db:types:check` | Verifies that `src/types/generated.ts` matches the current `schema.sql`. Fails if types are stale — re-run `npm run db:types` to regenerate. |
| `validate-schema.js` | `npm run db:validate:all` | Runs all schema-code alignment checks: type sync, field name case, UUID vs BIGSERIAL consistency. Run before every commit that touches database code. |
| `detect-case-mismatches.js` | `npm run db:field-names:check` | Detects camelCase field names in Supabase queries (should always be snake_case). |
| `scan-field-names.js` | Part of validation suite | Scans source files for incorrect field name patterns against the schema. |
| `optimize-images.js` | `npm run optimize-images` | Compresses and converts images in `public/` to WebP. Run before deploying new image assets. |
| `apply-certificate-migration.cjs` | Manual | Applies the certificate-related SQL migrations to the connected Supabase instance. Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. |
| `accessibility-audit.cjs` | `npm run audit:a11y` | Runs axe-core accessibility audit against a running local dev server. Reports WCAG violations. |

## Cross-References

- `schema.sql` — source of truth for all validation scripts
- `src/types/generated.ts` — output of type generation, verified by `check-schema-types.js`
- `migrations/` — SQL files applied by `apply-certificate-migration.cjs`
- `tests/accessibility/axe-audit.test.ts` — Vitest accessibility tests that complement the CJS audit script
