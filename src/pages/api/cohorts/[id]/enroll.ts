import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEnrollmentEmail } from '../../../../lib/email-notifications';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/cohorts/[id]/enroll
 * Enroll authenticated user in a cohort
 * Optional body:
 *   - user_id?: string (only for teachers/admins to enroll other users)
 */
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Invalid cohort ID' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Parse request body (optional user_id for teacher enrollment)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Empty body is fine for self-enrollment
    }

    // Determine who to enroll
    let targetUserId = user.id; // Default to self-enrollment
    let isTeacherEnrolling = false;

    if (body.user_id && body.user_id !== user.id) {
      // Teacher trying to enroll another user
      // First verify the cohort exists and get course info
      const { data: cohort, error: cohortError } = await supabase
        .from('cohorts')
        .select('*, courses!inner(created_by)')
        .eq('id', id)
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

      // Check if user is the course creator (teacher)
      if (cohort.courses.created_by !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Only course teachers can enroll other users' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      targetUserId = body.user_id;
      isTeacherEnrolling = true;
    }

    // Fetch cohort details
    const { data: cohort, error: cohortError } = await supabase
      .from('cohorts')
      .select('*')
      .eq('id', id)
      .single();

    if (cohortError || !cohort) {
      return new Response(
        JSON.stringify({ error: 'Cohort not found or access denied' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if cohort is accepting enrollments (must be upcoming or active)
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
    const { data: enrollment, error: enrollError } = await supabase
      .rpc('enroll_in_cohort', {
        p_cohort_id: id,
        p_user_id: targetUserId,
      });

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError);

      // Handle specific error codes from the function
      if (enrollError.code === '23505' || enrollError.message?.includes('Already enrolled')) {
        return new Response(
          JSON.stringify({ error: 'Already enrolled in this cohort' }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (enrollError.code === 'P0004' || enrollError.message?.includes('Cohort is full')) {
        return new Response(
          JSON.stringify({
            error: 'Cohort is full',
            max_students: cohort.max_students,
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (enrollError.code === 'P0003' || enrollError.message?.includes('not open for enrollment')) {
        return new Response(
          JSON.stringify({ error: 'Cohort is not open for enrollment' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to enroll: ' + enrollError.message }),
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
      .eq('user_id', targetUserId)
      .eq('course_id', cohort.course_id)
      .single();

    if (!existingCourseEnrollment) {
      // Create general course enrollment
      const { error: courseEnrollError } = await supabase
        .from('enrollments')
        .insert([
          {
            user_id: targetUserId,
            course_id: cohort.course_id,
            cohort_id: id,
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
        .eq('id', targetUserId)
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
        enrollment,
        cohort_enrollment: enrollment,
        message: isTeacherEnrolling
          ? 'User enrolled successfully'
          : 'Successfully enrolled in cohort',
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

/**
 * DELETE /api/cohorts/[id]/enroll
 * Unenroll (drop) from a cohort
 * Optional body:
 *   - user_id?: string (only for teachers to unenroll other users)
 */
export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Invalid cohort ID' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Parse request body (optional user_id for teacher unenrollment)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Empty body is fine for self-unenrollment
    }

    // Determine who to unenroll
    let targetUserId = user.id; // Default to self-unenrollment
    let isTeacherUnenrolling = false;

    if (body.user_id && body.user_id !== user.id) {
      // Teacher trying to unenroll another user
      const { data: cohort, error: cohortError } = await supabase
        .from('cohorts')
        .select('*, courses!inner(created_by)')
        .eq('id', id)
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

      // Check if user is the course creator (teacher)
      if (cohort.courses.created_by !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Only course teachers can unenroll other users' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      targetUserId = body.user_id;
      isTeacherUnenrolling = true;
    }

    // Update enrollment status to 'dropped' instead of deleting
    const { data: enrollment, error: updateError } = await supabase
      .from('cohort_enrollments')
      .update({ status: 'dropped' })
      .eq('cohort_id', id)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to unenroll: ' + updateError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: 'Enrollment not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        enrollment,
        message: isTeacherUnenrolling
          ? 'User unenrolled successfully'
          : 'Successfully unenrolled from cohort',
      }),
      {
        status: 200,
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
