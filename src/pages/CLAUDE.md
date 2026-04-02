# src/pages — Astro Pages and API Routes

## Purpose

All page routes and API endpoints for the C4C Campus application. Astro uses file-based routing — every `.astro` file is a page, every `.ts` file under `api/` is an API endpoint. All API routes set `export const prerender = false` for SSR.

## Page Overview

### Public Pages (no auth required)

| File | Route | Description |
|------|-------|-------------|
| `index.astro` | `/` | Homepage. Hero section targeting India bootcamp + Guild developers. CTAs to `/apply` and `/framework`. |
| `about.astro` | `/about` | About Code for Compassion and Open Paws. |
| `apply.astro` | `/apply` | Application form for prospective bootcamp students. Posts to `/api/apply`. |
| `application-status.astro` | `/application-status` | Lets applicants check their review status by email. |
| `contact.astro` | `/contact` | Contact form. Posts to `/api/contact`. |
| `courses.astro` | `/courses` | Course catalog with search and filter. Mounts search components. |
| `faq.astro` | `/faq` | Frequently asked questions. |
| `framework.astro` | `/framework` | The "Engineering Compassion" curriculum framework explanation. |
| `login.astro` | `/login` | Authentication page using Supabase Auth. |
| `forgot-password.astro` | `/forgot-password` | Password reset request. |
| `reset-password.astro` | `/reset-password` | Password reset with token from email. |
| `pricing.astro` | `/pricing` | Pricing tiers. Mounts `PricingTable`. |
| `programs.astro` | `/programs` | Program overview (bootcamp, Guild, RDP). |
| `tracks.astro` | `/tracks` | Learning track descriptions (animal advocacy, climate, AI safety). |
| `aarc.astro` | `/aarc` | Purpose unclear — needs human review. |
| `blog/index.astro` | `/blog` | Blog listing. |
| `blog/[slug].astro` | `/blog/[slug]` | Individual blog post. |
| `courses/[slug].astro` | `/courses/[slug]` | Course detail page with lesson navigation. |
| `verify/[code].astro` | `/verify/[code]` | Public certificate verification. |

### Authenticated Pages (student)

| File | Route | Description |
|------|-------|-------------|
| `dashboard.astro` | `/dashboard` | Student dashboard. Mounts `AIKeyWidget`, shows enrolled courses and progress. Includes language selector (Hindi, Tamil, Telugu — India launch prep). |
| `lessons/[slug].astro` | `/lessons/[slug]` | Individual lesson page with video, `LessonNav`, `LessonDiscussionContainer`. |
| `quizzes/[id]/take.astro` | `/quizzes/[id]/take` | Quiz-taking interface. |
| `quizzes/[id]/attempts.astro` | `/quizzes/[id]/attempts` | Quiz attempt history. |
| `quizzes/[id]/results/[attemptId].astro` | `/quizzes/[id]/results/[attemptId]` | Quiz result detail. |
| `assignments/index.astro` | `/assignments` | Student assignment list. |
| `assignments/[id].astro` | `/assignments/[id]` | Assignment detail with rubric and file uploader. |
| `assignments/[id]/submissions/[submissionId].astro` | `/assignments/[id]/submissions/[submissionId]` | Individual submission view. |
| `certificates/index.astro` | `/certificates` | Student certificate list. |
| `notifications/preferences.astro` | `/notifications/preferences` | Notification preference management. |
| `payment/success.astro` | `/payment/success` | Post-payment success. |
| `payment/canceled.astro` | `/payment/canceled` | Post-payment canceled. |

### Authenticated Pages (teacher/admin)

| File | Route | Description |
|------|-------|-------------|
| `teacher.astro` | `/teacher` | Teacher dashboard root. |
| `teacher/courses.astro` | `/teacher/courses` | Course management with `CourseBuilder`. |
| `teacher/cohorts/index.astro` | `/teacher/cohorts` | Cohort listing. |
| `teacher/cohorts/[id].astro` | `/teacher/cohorts/[id]` | Cohort detail: enrollment management, schedule, analytics. |
| `teacher/analytics.astro` | `/teacher/analytics` | Cohort analytics with `MetricCard`, `DateRangeSelector`. |
| `teacher/progress.astro` | `/teacher/progress` | Student progress overview with `StrugglingStudents`. |
| `admin.astro` | `/admin` | Admin root redirect. |
| `admin/dashboard.astro` | `/admin/dashboard` | Admin overview with platform stats. |
| `admin/applications.astro` | `/admin/applications` | Application management. |
| `admin/applications-review.astro` | `/admin/applications-review` | Application review queue with `assign-reviewer` action. |
| `admin/users.astro` | `/admin/users` | User management. |
| `admin/cohorts.astro` | `/admin/cohorts` | Admin cohort management. |
| `admin/blog.astro` | `/admin/blog` | Blog post management with `BlogEditor`. |
| `admin/analytics.astro` | `/admin/analytics` | Platform analytics with `D3HeatMap`. |
| `admin/search-analytics.astro` | `/admin/search-analytics` | Search query analytics. |

## Subdirectories

| Directory | Contents |
|-----------|----------|
| `api/` | All API endpoints — see `api/CLAUDE.md` |
| `admin/` | Admin pages (documented above) |
| `teacher/` | Teacher pages (documented above) |
| `blog/` | Blog pages (documented above) |
| `courses/` | Course detail page |
| `lessons/` | Lesson page |
| `quizzes/` | Quiz pages |
| `assignments/` | Assignment pages |
| `certificates/` | Certificate pages |
| `notifications/` | Notification preferences |
| `payment/` | Payment result pages |
| `verify/` | Certificate verification |

## Cross-References

- `src/layouts/` — all pages import one of three layouts
- `src/components/` — React islands mounted in pages
- `src/middleware/auth.ts` — enforces route protection server-side
- `src/pages/api/` — API routes called by page-mounted React components
