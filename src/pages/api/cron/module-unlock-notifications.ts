import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendModuleUnlockedEmail } from '../../../lib/email-notifications';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/cron/module-unlock-notifications
 * Daily cron job that sends notifications to students when a module unlocks.
 * Protected by CRON_SECRET Bearer token.
 */
export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('Authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Service role key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lookbackDays = 7;
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  const lookbackDateStr = lookbackDate.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Bound scan to recent unlocks so cron retries can catch misses without unbounded growth.
    const { data: schedules, error } = await supabaseAdmin
      .from('cohort_schedules')
      .select(`
        cohort_id,
        module_id,
        modules (title),
        cohorts (
          name,
          courses (title, slug)
        )
      `)
      .gte('unlock_date', lookbackDateStr)
      .lte('unlock_date', today)
      .order('unlock_date', { ascending: true });

    if (error) {
      console.error('[cron] Error fetching schedules:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedules' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No modules eligible for notifications', count: 0, lookbackDays }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cohortIds = Array.from(new Set(schedules.map((s: any) => String(s.cohort_id))));
    const moduleIds = Array.from(new Set(schedules.map((s: any) => String(s.module_id))));
    const existingNotifKeys = new Set<string>();

    // Load existing notifications once to avoid N+1 lookups for each schedule row.
    if (cohortIds.length > 0 && moduleIds.length > 0) {
      const { data: existingNotifs, error: existingNotifsError } = await supabaseAdmin
        .from('notifications')
        .select('metadata')
        .eq('type', 'course_update')
        .contains('metadata', { notification_subtype: 'module_unlocked' })
        .in('metadata->>cohort_id', cohortIds)
        .in('metadata->>module_id', moduleIds);

      if (existingNotifsError) {
        console.error('[cron] Error fetching existing notifications for dedupe:', existingNotifsError);
      } else {
        for (const notif of existingNotifs || []) {
          const cohortId = (notif as any)?.metadata?.cohort_id;
          const moduleId = (notif as any)?.metadata?.module_id;
          if (cohortId !== undefined && moduleId !== undefined) {
            existingNotifKeys.add(`${cohortId}:${moduleId}`);
          }
        }
      }
    }

    let totalNotified = 0;

    for (const schedule of schedules) {
      const moduleName = (schedule.modules as any)?.title || 'New Module';
      const courseName = (schedule.cohorts as any)?.courses?.title;
      const courseSlug = (schedule.cohorts as any)?.courses?.slug;

      if (!courseName || !courseSlug) continue;

      const notifKey = `${schedule.cohort_id}:${schedule.module_id}`;
      if (existingNotifKeys.has(notifKey)) {
        continue; // Already notified
      }

      // Get active students in this cohort
      const { data: enrollments } = await supabaseAdmin
        .from('cohort_enrollments')
        .select('user_id')
        .eq('cohort_id', schedule.cohort_id)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) continue;

      const userIds = enrollments.map((e: any) => e.user_id);

      // Insert in-app notifications
      const notifRecords = userIds.map((userId: string) => ({
        user_id: userId,
        type: 'course_update',
        title: `New Module Available: ${moduleName}`,
        content: `A new module "${moduleName}" is now available in ${courseName}. Log in to start learning!`,
        link: `/courses/${courseSlug}`,
        is_read: false,
        metadata: {
          module_id: schedule.module_id,
          cohort_id: schedule.cohort_id,
          notification_subtype: 'module_unlocked',
        },
      }));

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(notifRecords);

      if (notifError) {
        console.error('[cron] Error inserting notifications:', notifError);
        continue;
      }

      existingNotifKeys.add(notifKey);

      // Send emails
      const { data: apps } = await supabaseAdmin
        .from('applications')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const appMap = new Map((apps || []).map((a: any) => [a.user_id, a]));

      for (const userId of userIds) {
        const app = appMap.get(userId);
        if (app?.email) {
          sendModuleUnlockedEmail({
            studentName: app.name || 'Student',
            studentEmail: app.email,
            courseName,
            moduleName,
            courseSlug,
          }).catch((err) => {
            console.error(`[cron] Failed to send email to ${app.email}:`, err);
          });
        }
      }

      totalNotified += userIds.length;
      console.log(`[cron] Notified ${userIds.length} students for module "${moduleName}" in cohort ${schedule.cohort_id}`);
    }

    return new Response(
      JSON.stringify({ message: 'Notifications sent', count: totalNotified }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[cron] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
