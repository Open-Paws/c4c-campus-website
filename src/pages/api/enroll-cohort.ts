import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEnrollmentEmail } from '../../lib/email-notifications';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create supabase client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { cohortId } = body;

    if (!cohortId) {
      return new Response(
        JSON.stringify({ error: 'Cohort ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if cohort exists and is active/upcoming
    const { data: cohort, error: cohortError } = await supabase
      .from('cohorts')
      .select('id, name, course_id, status, max_students, start_date, end_date')
      .eq('id', cohortId)
      .single();

    if (cohortError || !cohort) {
      return new Response(
        JSON.stringify({ error: 'Cohort not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify cohort is open for enrollment
    if (cohort.status !== 'upcoming' && cohort.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Cohort is not open for enrollment' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if course is published
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .eq('id', cohort.course_id)
      .single();

    if (courseError || !course || !course.is_published) {
      return new Response(
        JSON.stringify({ error: 'Course is not available' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Use atomic enrollment function to prevent race conditions
    const { data: cohortEnrollment, error: cohortEnrollError } = await supabase
      .rpc('enroll_in_cohort', {
        p_cohort_id: cohortId,
        p_user_id: user.id,
      });

    if (cohortEnrollError) {
      console.error('Cohort enrollment error:', cohortEnrollError);

      // Parse error code from message prefix (e.g., "COHORT_NOT_FOUND: ...")
      const errorMessage = cohortEnrollError.message || '';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCodeFromMessage = errorCodeMatch ? errorCodeMatch[1] : null;

      // Handle specific error codes from the database function
      // Error codes: P0002=COHORT_NOT_FOUND, P0003=COHORT_NOT_OPEN, P0004=COHORT_FULL, 23505=ALREADY_ENROLLED
      if (cohortEnrollError.code === '23505' || errorCodeFromMessage === 'ALREADY_ENROLLED') {
        return new Response(
          JSON.stringify({ error: 'Already enrolled in this cohort', code: 'ALREADY_ENROLLED' }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (cohortEnrollError.code === 'P0002' || errorCodeFromMessage === 'COHORT_NOT_FOUND') {
        return new Response(
          JSON.stringify({ error: 'Cohort not found', code: 'COHORT_NOT_FOUND' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (cohortEnrollError.code === 'P0003' || errorCodeFromMessage === 'COHORT_NOT_OPEN') {
        return new Response(
          JSON.stringify({ error: 'Cohort is not open for enrollment', code: 'COHORT_NOT_OPEN' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (cohortEnrollError.code === 'P0004' || errorCodeFromMessage === 'COHORT_FULL') {
        return new Response(
          JSON.stringify({
            error: 'Cohort is full',
            code: 'COHORT_FULL',
            max_students: cohort.max_students,
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to enroll in cohort', code: 'ENROLLMENT_FAILED' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Also create a general course enrollment if not already enrolled
    const { data: existingCourseEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', cohort.course_id)
      .single();

    if (!existingCourseEnrollment) {
      // Create general course enrollment
      const { error: courseEnrollError } = await supabase
        .from('enrollments')
        .insert([
          {
            user_id: user.id,
            course_id: cohort.course_id,
            cohort_id: cohortId,
            status: 'active',
          },
        ]);

      if (courseEnrollError) {
        console.error('Course enrollment error:', courseEnrollError);
        // Continue anyway - cohort enrollment is more important
      }
    }

    // Send enrollment confirmation email (non-blocking)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (profile?.email) {
        sendEnrollmentEmail({
          studentName: profile.full_name || 'Student',
          studentEmail: profile.email,
          courseName: course.title,
          cohortName: cohort.name,
          startDate: cohort.start_date,
        }).catch(err => console.error('Enrollment email error:', err));
      }
    } catch (emailErr) {
      console.error('Failed to send enrollment email:', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohort_enrollment: cohortEnrollment,
        message: `Successfully enrolled in ${cohort.name}`,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
