<!-- omit in toc -->
# C4C Campus

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node ≥22](https://img.shields.io/badge/node-%3E%3D22.12.0-brightgreen)](package.json)
[![Astro 6](https://img.shields.io/badge/astro-6-orange)](https://astro.build)
[![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/hosting-Vercel-black)](https://vercel.com)
[![Open Paws](https://img.shields.io/badge/Open%20Paws-ecosystem-purple)](https://openpaws.ai)

C4C Campus is the public website and full Learning Management System (LMS) for [Code for Compassion](https://codeforcompassion.com) — a developer training program equipping engineers to build AI tools for animal advocacy, climate action, and AI safety. The same codebase powers the recruitment funnel and the enrolled-student experience. Based in Bengaluru with remote participation worldwide; hard launch target May 2026.

> [!NOTE]
> This project is part of the [Open Paws](https://openpaws.ai) ecosystem — AI infrastructure for the animal liberation movement. [Explore the full platform →](https://github.com/Open-Paws)

---

## Architecture overview

```
Browser → Vercel serverless (Astro 6 SSR)
              │
              ├── .astro pages  ← server data fetching, layout
              ├── React islands ← interactive UI (client:only / client:load)
              │
              └── Supabase (PostgreSQL + Auth + Storage + Realtime)
                    ├── anon key   — RLS enforced, client-safe
                    └── service key — RLS bypassed, server API routes only
```

---

## Quickstart

```bash
git clone https://github.com/Open-Paws/c4c-campus-website.git
cd c4c-campus-website
npm install
cp .env.example .env   # fill in SUPABASE and RESEND keys (see Configuration below)
npm run dev            # http://localhost:4321
```

Node.js ≥ 22.12.0 and npm 10.x are required (see `engines` in `package.json`).

---

## Features

**Public recruitment funnel**
- Home, About, Programs, Tracks, Framework, FAQ, Pricing pages
- Application form with Supabase-backed storage
- Blog

**Authenticated LMS (enrolled students)**
- Student dashboard: cohort progress, AI key widget, notifications
- Course browsing and lesson delivery — video via Plyr, rich text via Tiptap
- Assignments: submission, teacher grading, rubric display
- Quizzes: auto-graded, multiple question types (multiple choice, true/false, short answer, essay, multiple select)
- Discussion forums per lesson and per course
- PDF certificate generation
- OpenRouter AI key provisioning per student with configurable weekly spending cap

**Teacher portal**
- Course and module creation
- Cohort management and scheduling
- Grading workflow and analytics dashboards (D3 / Chart.js)

**Admin portal**
- Application review and user management
- Platform-wide statistics

**Infrastructure**
- SSR-only — every page renders on Vercel serverless; no static output
- Stripe payment integration (optional)
- Daily cron for module-unlock notifications (Vercel cron → `/api/cron/`)
- Husky pre-commit hooks enforcing schema-type sync

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/architecture-overview.md](docs/architecture-overview.md) | Request pipeline, islands architecture, auth flow |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema management, migrations, validation commands |
| [docs/data-model.md](docs/data-model.md) | All 34 tables, ID types, relationships |
| [docs/api-reference.md](docs/api-reference.md) | 40+ API endpoint reference |
| [docs/integrations.md](docs/integrations.md) | Supabase, OpenRouter, Resend, Stripe setup |
| [.env.example](.env.example) | All environment variables documented inline |

---

## Configuration

Minimum required variables (copy `.env.example` → `.env`):

| Variable | Scope | Purpose |
|----------|-------|---------|
| `PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Anon key — RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin key — bypasses RLS; never expose to client |
| `RESEND_API_KEY` | Server only | Transactional email |
| `SITE_URL` | Server | Canonical URL for email links and auth redirects |

Optional integrations: `OPENROUTER_MANAGEMENT_KEY` (AI key provisioning), `STRIPE_*` (payments), `CRON_SECRET` (scheduled tasks).

Variables prefixed `PUBLIC_` are embedded in client bundles at build time. All others are server-only.

---

## Available scripts

```bash
npm run dev                # Dev server with hot reload (port 4321)
npm run build              # Production build
npm run build:production   # Image optimization + type check + build
npm run preview            # Preview production build locally

npm run check              # astro check (TypeScript + template types)

npm run test               # Vitest unit tests
npm run test:watch         # Vitest in watch mode
npm run test:coverage      # Unit test coverage report
npm run test:integration   # Integration tests against real Supabase DB (sequential)

npm run db:types           # Regenerate src/types/generated.ts from local schema
npm run db:validate:all    # Schema + field name + case mismatch checks
npm run db:schema-apply    # Backup → destructive reset → validate (DESTRUCTIVE)
```

---

<details>
<summary><strong>Architecture details</strong></summary>

### Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro 6](https://astro.build) — SSR only (`output: 'server'`) |
| UI islands | [React 19](https://react.dev) (`client:only="react"` or `client:load`) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) with CSS custom property design system |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage + Realtime) |
| Auth | Supabase Auth + independent JWT verification via [`jose`](https://github.com/panva/jose) / JWKS |
| Email | [Resend](https://resend.com) |
| Hosting | [Vercel](https://vercel.com) (serverless SSR + cron jobs) |
| Payments | [Stripe](https://stripe.com) (optional) |
| AI features | [OpenRouter](https://openrouter.ai) Management API (per-student key provisioning) |
| Testing | [Vitest](https://vitest.dev) (unit + integration) + [Playwright](https://playwright.dev) (E2E, 6 configurations) |

### Key architectural decisions

- **SSR-only** — every page renders on Vercel serverless functions; no static output
- **Islands architecture** — `.astro` files handle layout and server data fetching; React `.tsx` islands handle interactivity
- **Database-driven content** — courses, modules, lessons, and cohort schedules live in Supabase, not in Astro content collections
- **Schema is immutable** — `schema.sql` is the single source of truth; TypeScript types must conform to it, never the reverse
- **Two Supabase client patterns** — anon key (RLS enforced, client-safe) and service role key (RLS bypassed, server API routes only, always after JWT verification)

### Project structure

```
c4c-campus-website/
├── schema.sql              # IMMUTABLE database schema — source of truth
├── astro.config.mjs        # Astro + Vercel SSR config
├── vercel.json             # Security headers + cron schedule
├── .env.example            # All environment variables documented
├── src/
│   ├── middleware/         # Request pipeline: perf → CORS → auth → cache → security
│   ├── lib/                # Shared server/client utilities (auth, Supabase, rate limiting)
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

### Database

`schema.sql` defines **34 tables** across these domains:

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

**ID types** — confusing these causes silent runtime failures:

| ID type | Tables | TypeScript |
|---------|--------|-----------|
| UUID (string) | `cohorts`, `quiz_attempts`, `assignment_submissions`, `applications`, most junction tables | `string` |
| BIGSERIAL (number) | `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress` | `number` |

Always check `schema.sql` before writing query code.

### Authentication

1. **Supabase Auth** handles registration, login, password reset, and sessions
2. **Server-side JWT verification** via `jose` / JWKS (`src/lib/auth.ts`) validates tokens independently on every privileged API route

Roles: `admin` (`/admin/*`), `teacher` (`/teacher/*`), `student` (`/dashboard`, `/assignments/*`). Stored in `profiles.role`, enforced by `src/middleware/auth.ts`.

### Deployment

1. Connect the repo to a Vercel project
2. Add all required environment variables in the Vercel dashboard
3. Deploy — the `@astrojs/vercel` adapter handles SSR
4. After first deploy, update the Supabase project's **Site URL** to match the Vercel domain

`vercel.json` schedules `/api/cron/module-unlock-notifications` daily at 06:00 UTC. The endpoint requires `CRON_SECRET` in the `Authorization` header.

</details>

---

## Contributing

Read existing code before writing anything. The schema is immutable — `schema.sql` is the final source of truth and must never be modified; all code adapts to it, not the reverse.

**Validation checklist before every commit:**

```bash
npx astro check              # TypeScript + template type check (zero errors required)
npm run db:types:check       # Schema-types sync (blocking pre-commit hook)
npm run db:validate:all      # All schema checks
npm run test:integration     # Integration tests
```

**Critical rules:**
- Never modify `schema.sql`
- Never edit `src/types/generated.ts` by hand — regenerate via `npm run db:types`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Always verify JWT before using the service role client in API routes
- Use `snake_case` in all database queries — `.select('user_id')`, never `.select('userId')`
- Don't refactor while fixing bugs — scope creep causes regressions

**Language standards:** This is software for the animal liberation movement. Use movement terminology precisely: **campaign**, **investigation**, **activist**, **farmed animal**, **factory farm**, **slaughterhouse**, **direct action**. Run `semgrep --config semgrep-no-animal-violence.yaml` on all code and docs edits. Avoid speciesist idioms — 60+ patterns are enforced by the [no-animal-violence](https://github.com/Open-Paws/no-animal-violence) tooling suite.

**Quality gate:** `desloppify scan --path .` — minimum score ≥85.

Developers interested in contributing to animal advocacy infrastructure are especially welcome. Open an issue or reach out at info@codeforcompassion.com.

---

## License

MIT © 2024–2026 [Open Paws](https://openpaws.ai)

See [LICENSE](LICENSE) for full text.

**Acknowledgments:** Built by Open Paws volunteers and contributors for the animal liberation movement. [Code for Compassion](https://codeforcompassion.com) is the developer training program this platform serves.

---

<!-- metadata
tech_stack: Astro 6, React 19, Tailwind CSS v4, Supabase, Vercel, TypeScript, Vitest, Playwright
project_status: active-development
difficulty: intermediate
skill_tags: full-stack, lms, ssr, supabase, astro, react, typescript, animal-advocacy
related_repos: platform, gary, structured-coding-with-ai
-->

---

[Donate](https://openpaws.ai/donate) · [Discord](https://discord.gg/openpaws) · [openpaws.ai](https://openpaws.ai) · [Volunteer](https://openpaws.ai/volunteer)
