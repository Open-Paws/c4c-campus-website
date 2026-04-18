# C4C Campus

**Engineering Compassion Through AI**

> Status: **Active Development** — Hard deadline: May 2026 Resident Developer cohort launch. The platform is predominantly working; contributors should expect active feature work alongside ongoing bug fixes.

C4C Campus is a full-featured Learning Management System (LMS) for [Code for Compassion](https://codeforcompassion.com) — a training program that equips developers to build AI tools for animal advocacy, climate action, and AI safety. Based in Bengaluru with remote participation worldwide.

This repository is part of the [Open Paws](https://openpaws.ai) ecosystem — infrastructure for the animal liberation movement.

---

## What is Code for Compassion?

Code for Compassion runs three programs to build technical capacity in impact movements:

| Program | Format | Who It's For |
|---------|--------|-------------|
| **Weekend Bootcamp** | 12 weeks, no coding required | Activists who want to build no-code/low-code AI tools |
| **Global Hackathons** | Intensive sprint | Developers who want to prototype advocacy tools and find a team |
| **Full-Time Accelerator** | 12 weeks intensive | Developers taking a prototype to production |

### Three Focus Tracks

| Animal Advocacy | Climate Action | AI Safety |
|-----------------|----------------|-----------|
| Supply chain transparency | Greenwashing detection | Harm detection |
| Rescue coordination | Renewable energy optimization | Adversarial defense |
| Campaign automation | Climate litigation support | Ethics testing |

---

## What This Codebase Does

This repo is the public-facing website **and** the LMS backend — the same codebase powers both the recruitment funnel and the enrolled student experience:

**Public pages** (recruitment funnel):
- Home, About, Programs, Tracks, Framework, FAQ, Pricing
- Apply (application form with Supabase storage)
- Blog

**Authenticated LMS** (enrolled students, teachers, admins):
- Student dashboard with cohort progress, AI key widget, notifications
- Course browsing and lesson delivery (video via Plyr, rich text via Tiptap)
- Assignments: submission, grading, rubrics
- Quizzes: auto-graded, multiple question types
- Discussion forums per lesson and per course
- Certificates with PDF generation
- Teacher portal: course creation, cohort management, grading, analytics
- Admin portal: application review, user management, platform stats
- OpenRouter AI key provisioning per student (weekly spending limit enforced)
- Stripe payment integration (optional)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro 6](https://astro.build) — SSR only (no static generation) |
| UI islands | [React 19](https://react.dev) (`client:only="react"` or `client:load`) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) with CSS custom property design system |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage + Realtime) |
| Auth | Supabase Auth + independent JWT verification via [`jose`](https://github.com/panva/jose) / JWKS |
| Email | [Resend](https://resend.com) |
| Hosting | [Vercel](https://vercel.com) (serverless SSR + cron jobs) |
| Payments | [Stripe](https://stripe.com) (optional) |
| AI features | [OpenRouter](https://openrouter.ai) Management API (per-student key provisioning) |
| Testing | [Vitest](https://vitest.dev) (unit + integration) + [Playwright](https://playwright.dev) (E2E) |

### Key architectural decisions

- **SSR-only** — every page renders on Vercel serverless functions; no static output
- **Islands architecture** — `.astro` files handle layout and server data fetching; React `.tsx` islands handle interactivity
- **Database-driven content** — courses, modules, lessons, and cohort schedules live in Supabase, not in Astro content collections
- **Schema is immutable** — `schema.sql` is the single source of truth; TypeScript types must conform to it, never the reverse
- **Two Supabase client patterns** — anon key (RLS enforced, client-safe) and service role key (RLS bypassed, server API routes only, always after JWT verification)

---

## Local Development Setup

### Prerequisites

- Node.js >= 22.12.0 (see `package.json` `engines` field)
- npm 10.x
- A Supabase project (free tier works)
- A Resend account for email (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/Open-Paws/c4c-campus-website.git
cd c4c-campus-website
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — minimum required:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your_api_key
SITE_URL=http://localhost:4321
NODE_ENV=development
```

Find `PUBLIC_SUPABASE_URL` and keys at **Supabase dashboard → Settings → API**.

### 3. Apply the database schema

```bash
# Requires DATABASE_URL set in .env (Supabase → Project Settings → Database → Connection string → URI)
npm run db:schema-apply   # backup → destructive reset → validate
```

See [`docs/DATABASE.md`](docs/DATABASE.md) for detailed schema management, troubleshooting, and the incremental migration workflow.

### 4. Run the dev server

```bash
npm run dev
```

Open `http://localhost:4321`.

---

## Configuration Reference

All environment variables are documented in `.env.example`. Summary:

### Required

| Variable | Scope | Purpose |
|----------|-------|---------|
| `PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Anon key — RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin key — bypasses RLS; never expose to client |
| `RESEND_API_KEY` | Server only | Transactional email |
| `SITE_URL` | Server | Canonical URL (used in email links, CORS, auth redirects) |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENROUTER_MANAGEMENT_KEY` | — | Per-student AI key provisioning; feature hidden if absent |
| `OPENROUTER_STUDENT_WEEKLY_LIMIT` | `10` | USD weekly spend cap per student |
| `OPENROUTER_REGEN_COOLDOWN_HOURS` | `24` | Hours between key regenerations |
| `CRON_SECRET` | — | Auth token for Vercel cron calls to `/api/cron/*` |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | Stripe client key; payment UI hidden if absent |
| `STRIPE_SECRET_KEY` | — | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook verification |
| `DATABASE_URL` | — | Direct PostgreSQL URI — local dev scripts only, never Vercel |

**Naming convention:** variables prefixed `PUBLIC_` are embedded in client bundles at build time. All others are server-only.

---

## Available Scripts

```bash
# Development
npm run dev               # Astro dev server with hot reload (port 4321)
npm run build             # Production build
npm run build:production  # Image optimization + type check + build
npm run preview           # Preview production build locally

# Type checking
npm run check             # astro check (TypeScript + template types)

# Testing
npm run test              # Vitest unit tests (fast, jsdom)
npm run test:watch        # Vitest in watch mode
npm run test:coverage     # Unit test coverage report
npm run test:integration  # Integration tests against real Supabase DB (sequential)

# Database
npm run db:types          # Regenerate src/types/generated.ts from local schema
npm run db:types:check    # Verify generated types match schema
npm run db:validate:all   # Run all schema validation checks
npm run db:schema-apply   # Backup → destructive reset → validate (DESTRUCTIVE)

# Quality
npx astro check           # TypeScript type checking
```

---

## Project Structure

```
c4c-campus-website/
├── schema.sql              # IMMUTABLE database schema — source of truth
├── astro.config.mjs        # Astro + Vercel SSR config
├── vercel.json             # Security headers + cron schedule
├── .env.example            # All environment variables documented
├── src/
│   ├── middleware/         # Request pipeline: perf → CORS → auth → cache → security
│   ├── lib/                # Shared server/client utilities (auth, Supabase, rate limiting…)
│   ├── types/
│   │   ├── generated.ts    # AUTO-GENERATED — never edit by hand
│   │   └── index.ts        # Application-level types extending generated
│   ├── pages/
│   │   ├── index.astro     # Home
│   │   ├── apply.astro     # Application form
│   │   ├── dashboard.astro # Student dashboard (auth required)
│   │   ├── courses/        # Course browsing + lesson delivery
│   │   ├── assignments/    # Assignment submission
│   │   ├── quizzes/        # Quiz delivery
│   │   ├── teacher/        # Teacher portal
│   │   ├── admin/          # Admin portal
│   │   └── api/            # 40+ API endpoints (Astro file-based routing)
│   ├── components/
│   │   ├── student/        # Student dashboard widgets (React islands)
│   │   ├── teacher/        # Teacher grading/creation tools
│   │   ├── course/         # Course display components
│   │   ├── analytics/      # D3/Chart.js data visualizations
│   │   ├── search/         # Search UI
│   │   ├── certificates/   # Certificate generation
│   │   └── payments/       # Stripe integration
│   ├── layouts/            # Astro layout templates
│   └── styles/             # Global CSS + Tailwind base
├── tests/
│   ├── unit/               # Vitest + jsdom
│   ├── integration/        # Vitest + real Supabase DB
│   ├── e2e/                # Playwright (6 browser/device configurations)
│   └── security/           # File upload validation, malware scanning
├── migrations/             # Incremental SQL migrations
├── scripts/                # DB validation, type generation, maintenance
└── docs/                   # Extended documentation
```

---

## Database Architecture

The schema (`schema.sql`) defines **34 tables** across these domains:

- **Auth & profiles:** `applications`, `profiles`, `auth_logs`
- **Course structure:** `courses`, `modules`, `lessons`
- **Cohort system:** `cohorts`, `cohort_enrollments`, `cohort_schedules`, `enrollments`, `lesson_progress`
- **Discussions:** `lesson_discussions`, `course_forums`, `forum_replies`
- **Assessments:** `quizzes`, `quiz_questions`, `quiz_attempts`, `assignments`, `assignment_rubrics`, `assignment_submissions`
- **Messaging:** `message_threads`, `messages`, `notifications`, `announcements`
- **AI assistant:** `ai_conversations`, `ai_messages`, `ai_usage_logs`
- **Certificates:** `certificates`, `certificate_templates`
- **Payments:** `payments`, `subscriptions`
- **Media & analytics:** `media_library`, `analytics_events`

### Critical: ID types

| ID type | Tables | TypeScript |
|---------|--------|-----------|
| UUID (string) | `cohorts`, `quiz_attempts`, `assignment_submissions`, `applications`, most junction tables | `string` |
| BIGSERIAL (number) | `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress` | `number` |

Confusing these causes silent runtime failures. Always check `schema.sql` before writing query code.

### Schema-TypeScript sync

`src/types/generated.ts` is auto-generated and must never be edited manually. When you change `schema.sql`:

1. Run `npm run db:types` to regenerate `src/types/generated.ts`
2. Update hand-maintained types in `src/types/index.ts` as needed
3. Run `npm run db:validate:all` to catch drift
4. Commit `schema.sql` and `src/types/generated.ts` together

A GitHub Actions workflow fails CI when generated types drift from the schema.

---

## Authentication

Authentication uses a two-layer approach:

1. **Supabase Auth** handles registration, login, password reset, and sessions
2. **Server-side JWT verification** via `jose` / JWKS (`src/lib/auth.ts`) validates tokens independently

API routes that use the service role key bypass Row Level Security. The `jose`-based check ensures forged tokens cannot reach privileged endpoints.

**Roles:** `admin` (`/admin/*`), `teacher` (`/teacher/*`), `student` (`/dashboard`, `/assignments/*`). Stored in `profiles.role`, enforced by `src/middleware/auth.ts`.

---

## Deployment

### Vercel (production)

1. Connect the repo to a Vercel project
2. Add all required environment variables in the Vercel dashboard
3. Deploy — the `@astrojs/vercel` adapter handles everything

After first deploy, update your Supabase project's **Site URL** to match your Vercel domain.

**Cron job:** `vercel.json` schedules `/api/cron/module-unlock-notifications` daily at 06:00 UTC. The endpoint requires `CRON_SECRET` in the `Authorization` header.

### Build commands

| Command | Use |
|---------|-----|
| `npm run build` | Standard Vercel build |
| `npm run build:production` | Local production build with image optimization and type check |

---

## Contributing

### Before making any change

1. Read the relevant source files — understand what exists before writing
2. Check `schema.sql` for exact column names, types, and constraints
3. Run `npx astro check` to confirm the baseline compiles cleanly
4. Run `npm run db:validate:all` for schema-code alignment

### Validation checklist before committing

```bash
npx astro check              # Type check
npm run db:types:check        # Schema-types sync (blocking pre-commit hook)
npm run db:field-names:check  # Field naming (non-blocking warning)
npm run db:validate:all       # All checks
npm run test:integration      # Integration tests
```

### Critical rules

- **Never modify `schema.sql`** — it is immutable. All code must adapt to the schema, not the reverse
- **Never edit `src/types/generated.ts` by hand** — always regenerate via `npm run db:types`
- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in client-side code
- **Always verify JWT** before using the service role client in API routes
- **Use snake_case in all database queries** — `.select('user_id')`, never `.select('userId')`
- **Don't refactor while fixing bugs** — stay focused; scope creep causes regressions

### Language and domain standards

This is software for the animal liberation movement. All code, comments, commit messages, and documentation must:

- Use movement terminology precisely: **campaign**, **investigation**, **activist**, **farmed animal**, **factory farm**, **slaughterhouse**, **direct action**
- Use **farmed animal/s** — never industry commodity framing
- Avoid speciesist idioms (60+ patterns enforced by the [no-animal-violence](https://github.com/Open-Paws/no-animal-violence) tooling suite)
- Run `semgrep --config semgrep-no-animal-violence.yaml` on all code/docs edits

### Quality gates

- **Desloppify score:** `desloppify scan --path .` — minimum ≥85
- **TypeScript:** zero errors from `npx astro check` before pushing
- **Schema:** `npm run db:validate:all` must pass before any commit touching DB code

---

## Accessibility

C4C Campus is the India recruitment funnel for a movement. Accessibility is not optional:

- Must work on low-end Android devices and 3G connections
- Screen reader navigation, keyboard-only flows, and sufficient color contrast are requirements
- Internationalization is planned — do not bake in English-only assumptions
- Progressive disclosure applies to any advocacy content with strong imagery or statistics

---

## License

MIT

## Contact

info@codeforcompassion.com

---

Built by [Open Paws](https://openpaws.ai) for the animal liberation movement.
