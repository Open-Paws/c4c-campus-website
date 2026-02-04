import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { validatePassword } from '../../lib/password-validation';
import { sendApplicationReceivedEmail } from '../../lib/email-notifications';

// Enable server-side rendering for this API route
export const prerender = false;

// Error code constants for consistent error handling
const APPLICATION_ERROR_CODES = {
  // Auth errors
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  SIGNUPS_DISABLED: 'SIGNUPS_DISABLED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Database errors
  APPLICATION_ALREADY_EXISTS: 'APPLICATION_ALREADY_EXISTS',
  INVALID_PROGRAM: 'INVALID_PROGRAM',
  INVALID_SCHOLARSHIP_CATEGORY: 'INVALID_SCHOLARSHIP_CATEGORY',
  INVALID_CURRENT_STAGE: 'INVALID_CURRENT_STAGE',
  INVALID_FUNDING: 'INVALID_FUNDING',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Validation errors
  SCHOLARSHIP_CATEGORY_REQUIRED: 'SCHOLARSHIP_CATEGORY_REQUIRED',
  PASSWORDS_DO_NOT_MATCH: 'PASSWORDS_DO_NOT_MATCH',

  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
} as const;

// Error mapping function for user-friendly error messages
function mapApplicationError(
  error: { code?: string; message?: string; details?: string },
  context: 'auth' | 'database'
): { status: number; error: string; code: string } {
  const errorMessage = error.message?.toLowerCase() ?? '';
  const errorCode = error.code ?? '';
  const errorDetails = error.details?.toLowerCase() ?? '';

  if (context === 'auth') {
    // Handle authentication errors
    if (errorMessage.includes('user already registered') ||
        errorMessage.includes('email already exists') ||
        errorMessage.includes('already been registered')) {
      return {
        status: 409,
        error: 'An account with this email already exists. Please log in at /login or use a different email address.',
        code: APPLICATION_ERROR_CODES.EMAIL_ALREADY_EXISTS
      };
    }

    if (errorMessage.includes('password should be at least') ||
        errorMessage.includes('weak password') ||
        errorMessage.includes('password is too')) {
      return {
        status: 400,
        error: 'Password does not meet security requirements. Please use a stronger password.',
        code: APPLICATION_ERROR_CODES.WEAK_PASSWORD
      };
    }

    if (errorMessage.includes('invalid email') ||
        errorMessage.includes('email format')) {
      return {
        status: 400,
        error: 'Please provide a valid email address.',
        code: APPLICATION_ERROR_CODES.INVALID_EMAIL
      };
    }

    if (errorMessage.includes('signups not allowed') ||
        errorMessage.includes('signup is disabled')) {
      return {
        status: 403,
        error: 'Account registration is currently unavailable. Please contact info@codeforcompassion.com for assistance.',
        code: APPLICATION_ERROR_CODES.SIGNUPS_DISABLED
      };
    }

    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests')) {
      return {
        status: 429,
        error: 'Too many signup attempts. Please try again in a few minutes.',
        code: APPLICATION_ERROR_CODES.RATE_LIMIT_EXCEEDED
      };
    }

    // Default auth error
    return {
      status: 400,
      error: 'Unable to create account. Please check your information and try again.',
      code: APPLICATION_ERROR_CODES.UNKNOWN_ERROR
    };
  }

  // Handle database errors
  if (errorCode === '23505') {
    // Unique constraint violation
    if (errorMessage.includes('user_id') || errorDetails.includes('user_id')) {
      return {
        status: 409,
        error: 'You have already submitted an application. Please check your email or contact info@codeforcompassion.com.',
        code: APPLICATION_ERROR_CODES.APPLICATION_ALREADY_EXISTS
      };
    }
  }

  if (errorCode === '23503') {
    // Foreign key violation
    return {
      status: 500,
      error: 'Unable to create application. Please try again or contact support.',
      code: APPLICATION_ERROR_CODES.DATABASE_ERROR
    };
  }

  if (errorCode === '23514') {
    // CHECK constraint violation - parse constraint name
    if (errorMessage.includes('program') || errorDetails.includes('program')) {
      return {
        status: 400,
        error: 'Invalid program selection. Please choose Bootcamp, Accelerator, or Hackathon.',
        code: APPLICATION_ERROR_CODES.INVALID_PROGRAM
      };
    }
    if (errorMessage.includes('scholarship_category') || errorDetails.includes('scholarship_category')) {
      return {
        status: 400,
        error: 'Invalid scholarship category. Please select a valid option.',
        code: APPLICATION_ERROR_CODES.INVALID_SCHOLARSHIP_CATEGORY
      };
    }
    if (errorMessage.includes('current_stage') || errorDetails.includes('current_stage')) {
      return {
        status: 400,
        error: 'Invalid project stage. Please select a valid option.',
        code: APPLICATION_ERROR_CODES.INVALID_CURRENT_STAGE
      };
    }
    if (errorMessage.includes('funding') || errorDetails.includes('funding')) {
      return {
        status: 400,
        error: 'Invalid funding type. Please select a valid option.',
        code: APPLICATION_ERROR_CODES.INVALID_FUNDING
      };
    }
  }

  if (errorCode === '23502') {
    // NOT NULL violation
    return {
      status: 400,
      error: 'Missing required information. Please fill in all required fields.',
      code: APPLICATION_ERROR_CODES.MISSING_REQUIRED_FIELDS
    };
  }

  // RLS policy block or insufficient privileges
  if (errorMessage.includes('permission denied') ||
      errorMessage.includes('insufficient privilege') ||
      errorMessage.includes('policy') ||
      errorCode === '42501') {
    return {
      status: 500,
      error: 'Unable to save application due to a system configuration issue. Please contact info@codeforcompassion.com with your email to complete your application.',
      code: APPLICATION_ERROR_CODES.PERMISSION_ERROR
    };
  }

  // Default database error
  return {
    status: 500,
    error: 'An unexpected error occurred. Please try again or contact info@codeforcompassion.com for assistance.',
    code: APPLICATION_ERROR_CODES.UNKNOWN_ERROR
  };
}

// Check if service role key is configured
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const isServiceRoleKeyConfigured = typeof serviceRoleKey === 'string' && serviceRoleKey.trim().length > 0;

// Create admin client with service role key (bypasses RLS)
// Note: supabaseAdmin may be non-functional if service role key is missing
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  serviceRoleKey || ''
);

export const POST: APIRoute = async ({ request }) => {
  // Early return if service role key is not configured
  if (!isServiceRoleKeyConfigured) {
    console.error('[API /apply] SUPABASE_SERVICE_ROLE_KEY is not configured. Application submissions cannot be processed.');
    return new Response(
      JSON.stringify({
        error: 'Unable to save application due to a system configuration issue. Please contact info@codeforcompassion.com with your email to complete your application.',
        code: APPLICATION_ERROR_CODES.PERMISSION_ERROR
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.json();

    const { email, password, confirmPassword, program, ...applicationData } = formData;

    // Normalize and validate scholarship fields
    // Use strict boolean coercion: only actual true or string 'true' counts as positive
    const rawScholarshipValue = applicationData.scholarshipRequested;
    let scholarshipRequested = rawScholarshipValue === true || rawScholarshipValue === 'true';
    let scholarshipCategory: string | null = applicationData.scholarshipCategory?.trim() ?? null;
    if (!scholarshipCategory) {
      scholarshipCategory = null;
    }

    // If scholarship is requested but category is missing, reject the request
    if (scholarshipRequested && !scholarshipCategory) {
      return new Response(
        JSON.stringify({
          error: 'Scholarship category is required when requesting a scholarship',
          code: APPLICATION_ERROR_CODES.SCHOLARSHIP_CATEGORY_REQUIRED
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({
          error: 'Passwords do not match',
          code: APPLICATION_ERROR_CODES.PASSWORDS_DO_NOT_MATCH
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength (VULN-002 fix)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      console.warn('[API /apply] Weak password rejected:', passwordValidation.errors);
      return new Response(
        JSON.stringify({
          error: 'Password does not meet security requirements',
          code: APPLICATION_ERROR_CODES.WEAK_PASSWORD,
          details: passwordValidation.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a regular Supabase client for signUp (this triggers verification email)
    const supabaseClient = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Use signUp instead of admin.createUser - this sends verification email automatically
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: applicationData.name,
          program,
          status: 'pending'
        },
        emailRedirectTo: `${import.meta.env.SITE_URL || 'https://codeforcompassion.com'}/login?verified=true`
      }
    });

    if (authError) {
      console.error('[API /apply] Auth error:', {
        code: authError.code,
        message: authError.message,
        status: authError.status
      });
      const mappedError = mapApplicationError(authError, 'auth');
      return new Response(
        JSON.stringify({ error: mappedError.error, code: mappedError.code }),
        { status: mappedError.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      console.error('[API /apply] User creation failed: authData.user is null');
      return new Response(
        JSON.stringify({
          error: 'Failed to create user account. Please try again.',
          code: APPLICATION_ERROR_CODES.UNKNOWN_ERROR
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store application data in applications table (using admin client - bypasses RLS)
    const { error: dbError } = await supabaseAdmin
      .from('applications')
      .insert({
        user_id: authData.user.id,
        program,
        status: 'pending',
        role: 'student', // All new signups are students by default
        name: applicationData.name,
        email,
        whatsapp: applicationData.whatsapp,
        location: applicationData.location,
        discord: applicationData.discord,
        // Bootcamp specific fields
        interests: applicationData.interests,
        motivation: applicationData.motivation,
        technical_experience: applicationData.technicalExperience,
        commitment: applicationData.commitment,
        // Scholarship fields (using normalized values)
        scholarship_requested: scholarshipRequested,
        scholarship_category: scholarshipCategory,
        // Accelerator specific fields
        track: applicationData.track,
        project_name: applicationData.projectName,
        project_description: applicationData.projectDescription,
        prototype_link: applicationData.prototypeLink,
        tech_stack: applicationData.techStack,
        target_users: applicationData.targetUsers,
        production_needs: applicationData.productionNeeds,
        team_size: applicationData.teamSize ? parseInt(applicationData.teamSize) : null,
        current_stage: applicationData.currentStage,
        funding: applicationData.funding,
        // Diversity and career fields (both programs)
        protected_class: applicationData.protectedClass,
        career_goals: applicationData.careerGoals
      });

    if (dbError) {
      console.error('[API /apply] Database error:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      const mappedError = mapApplicationError(dbError, 'database');
      return new Response(
        JSON.stringify({ error: mappedError.error, code: mappedError.code }),
        { status: mappedError.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send admin notification email (await to ensure delivery in serverless)
    try {
      await sendApplicationReceivedEmail({
        name: applicationData.name,
        email,
        program,
        location: applicationData.location,
        discord: applicationData.discord,
        motivation: applicationData.motivation,
        projectName: applicationData.projectName,
        projectDescription: applicationData.projectDescription,
      });
    } catch (err) {
      // Log but don't fail - application was already saved to database
      console.error('Failed to send admin notification:', err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application submitted successfully! Check your email to verify your account.',
        userId: authData.user.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[API /apply] Unexpected error:', error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error
    );
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred while processing your application. Please try again or contact info@codeforcompassion.com for assistance.',
        code: APPLICATION_ERROR_CODES.UNEXPECTED_ERROR
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
