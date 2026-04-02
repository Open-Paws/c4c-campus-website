# src/layouts — Astro Page Layouts

## Purpose

Shared Astro layout wrappers. Every page imports one of these — they provide the HTML shell, global CSS, meta tags, and role-specific navigation. Three layouts exist for three user roles.

## Files

| File | Description |
|------|-------------|
| `BaseLayout.astro` | Root layout used by all public pages and student dashboard. Injects `global.css`, Open Graph/Twitter meta tags, canonical URL, favicon. Props: `title` (required), `description`, `image`, `hideHeader`, `hideFooter`. Default description references the India hub framing ("responsible, impact-driven technology"). |
| `AdminLayout.astro` | Extends `BaseLayout` with an admin nav sidebar: Dashboard, Applications, Users, Cohorts, Blog, Analytics. Props: `title`, `currentPage` (highlights active nav item). Hides the public header and footer (`hideHeader`, `hideFooter`). |
| `TeacherLayout.astro` | Extends `BaseLayout` with teacher-specific navigation. Props: `title`, `currentPage`. Used by all `/teacher/*` pages. |

## Key Patterns

- All authenticated layouts hide the public header/footer — they render their own role-specific navigation
- `BaseLayout` sets the canonical URL from `Astro.site + Astro.url.pathname` — ensure `site` is configured in `astro.config.mjs` for production
- Layout files do NOT enforce auth — auth is enforced server-side in `src/middleware/auth.ts`

## Cross-References

- `src/styles/global.css` — imported in `BaseLayout.astro`
- `src/middleware/auth.ts` — enforces role access before pages render
- `src/pages/admin/*` — all use `AdminLayout`
- `src/pages/teacher/*` — all use `TeacherLayout`
- `src/pages/dashboard.astro` — uses `BaseLayout` with hidden header/footer
