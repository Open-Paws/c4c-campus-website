# migrations — Database Migration Files

## Purpose

Incremental SQL migrations for Supabase. Applied manually via the Supabase dashboard or `scripts/apply-certificate-migration.cjs`. Migrations are additive only — they never alter `schema.sql` (which is immutable). They add policies, fix RLS rules, seed data, or add optional columns.

**CRITICAL:** Do not create migrations that alter core table structure. `schema.sql` is the source of truth. If a structural change seems necessary, stop and consult with the project owner.

## Migration Log

| File | Description |
|------|-------------|
| `001_add_decision_note_column.sql` | Adds `decision_note` column to applications table. |
| `002_add_protected_class_career_goals.sql` | Adds protected class and career goals fields to applications. |
| `003_add_youtube_url_to_lessons.sql` | Adds `youtube_url` column to lessons table. |
| `004_fix_cohorts_rls_policy.sql` | First fix pass for cohorts RLS. |
| `005_add_youtube_url_validation.sql` | Adds CHECK constraint for YouTube URL format. |
| `006_cohorts_rls_security_and_performance.sql` | Security and performance improvements to cohorts RLS policies. |
| `007_fix_cohorts_rls_complete.sql` | Complete cohorts RLS fix. |
| `008_fix_youtube_url_validation.sql` | Revised YouTube URL validation constraint. |
| `009_complete_cohorts_rls_fix.sql` | Final cohorts RLS fix. |
| `00010_admin_cohort_policies.sql` | Admin-level RLS policies for cohorts. |
| `00011_teacher_applications_policy.sql` | Teacher access policy for applications. |
| `00011_teacher_applications_policy_safe.sql` | Safe version of teacher applications policy (non-destructive). |
| `00012_rollback_teacher_applications_policy.sql` | Rollback for teacher applications policy. |
| `00013_fix_teacher_policy_recursion.sql` | Fixes infinite recursion in teacher policy evaluation. |
| `00014_fix_lesson_discussions_rls.sql` | Fixes lesson discussions RLS. |
| `00015_add_lesson_discussions_crud_policies.sql` | Adds full CRUD RLS policies to lesson_discussions. |
| `00016_add_teacher_lesson_progress_read_policy.sql` | Allows teachers to read student lesson progress. |
| `00017_add_admin_lesson_progress_read_policy.sql` | Allows admins to read all lesson progress. |
| `00018_add_admin_course_management_policies.sql` | Admin policies for course management tables. |
| `00019_fix_rpc_caller_authorization.sql` | Fixes authorization check in RPC functions. |
| `00020_document_cohorts_visibility_policy.sql` | Documents/clarifies cohorts visibility policy (likely a comment-only migration). |
| `00021_add_admin_legacy_enrollments_policy.sql` | Admin access policy for legacy enrollment records. |
| `00022_create_blog_posts_table.sql` | Creates the `blog_posts` table. |
| `00023_seed_blog_posts.sql` | Seeds initial blog post content. |
| `00024_rename_blog_categories.sql` | Renames blog category values. |

## Naming Convention

Migrations use two numbering schemes: `001`-`009` (early) and `00010`+ (padded). When adding new migrations, continue the padded scheme (`00025_description.sql`).

## Cross-References

- `schema.sql` — immutable base schema; migrations layer on top of this
- `scripts/apply-certificate-migration.cjs` — applies certificate-related migrations
- `tests/integration/rls-policies.test.ts` — verifies RLS policies are correct
- `tests/integration/schema-code-alignment.test.ts` — validates types align with live schema post-migration
