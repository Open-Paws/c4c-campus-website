/**
 * Teacher Enroll Student API
 * POST /api/teacher/enroll-student
 * Body: { userId: string, courseId: number, cohortId: string }
 *
 * Enrolls a student in both the cohort (cohort_enrollments) and the course
 * (enrollments) in a single server-side operation. Uses service role key to
 * bypass RLS so both tables are written in one request.
 *
 * Note: These are separate DB calls, not a single transaction. The
 * check-then-act logic is idempotent and handles duplicate/race conditions
 * gracefully (unique constraint violations treated as success).
 */

import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  verifyTeacherOrAdminAccess,
  createServiceClient,
} from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Authenticate: verify JWT signature + extract user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const supabase = createServiceClient();

    const isTeacherOrAdmin = await verifyTeacherOrAdminAccess(supabase, user.id);
    if (!isTeacherOrAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Teacher access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { userId, courseId, cohortId } = body;

    if (!userId || courseId == null || !cohortId) {
      return new Response(JSON.stringify({ error: 'userId, courseId, and cohortId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify teacher owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (course.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not own this course' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Ensure cohort enrollment exists (upsert: create or reactivate)
    const { data: existingCohortEnrollment } = await supabase
      .from('cohort_enrollments')
      .select('id, status')
      .eq('cohort_id', cohortId)
      .eq('user_id', userId)
      .single();

    if (existingCohortEnrollment) {
      // Reactivate if previously dropped/paused
      if (existingCohortEnrollment.status !== 'active') {
        const { error: reactivateError } = await supabase
          .from('cohort_enrollments')
          .update({ status: 'active', last_activity_at: new Date().toISOString() })
          .eq('id', existingCohortEnrollment.id);
        if (reactivateError) {
          console.error('[enroll-student] Error reactivating cohort enrollment:', reactivateError);
          return new Response(JSON.stringify({ error: 'Failed to reactivate cohort enrollment' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } else {
      const { error: cohortEnrollError } = await supabase
        .from('cohort_enrollments')
        .insert([{
          cohort_id: cohortId,
          user_id: userId,
          status: 'active',
          completed_lessons: 0,
          progress: { completed_lessons: 0, completed_modules: 0, percentage: 0 },
        }]);

      if (cohortEnrollError) {
        // Unique constraint violation (23505) means a concurrent request already
        // inserted this row — treat as success rather than failing with 500
        if (cohortEnrollError.code !== '23505') {
          console.error('[enroll-student] Error creating cohort enrollment:', cohortEnrollError);
          return new Response(JSON.stringify({ error: 'Failed to enroll student in cohort' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // 2. Ensure course enrollment exists (upsert: create or reactivate)
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      // Reactivate if previously dropped/paused, and link to cohort
      if (existingEnrollment.status !== 'active') {
        const { error: reactivateEnrollError } = await supabase
          .from('enrollments')
          .update({ status: 'active', cohort_id: cohortId })
          .eq('id', existingEnrollment.id);
        if (reactivateEnrollError) {
          console.error('[enroll-student] Error reactivating enrollment:', reactivateEnrollError);
          return new Response(JSON.stringify({ error: 'Failed to reactivate enrollment' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } else {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert([{
          user_id: userId,
          course_id: courseId,
          cohort_id: cohortId,
          status: 'active',
        }]);

      if (enrollError) {
        // Unique constraint violation (23505) means a concurrent request already
        // inserted this row — treat as success rather than failing with 500
        if (enrollError.code !== '23505') {
          console.error('[enroll-student] Error creating course enrollment:', enrollError);
          return new Response(JSON.stringify({ error: 'Failed to create course enrollment' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[enroll-student] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
