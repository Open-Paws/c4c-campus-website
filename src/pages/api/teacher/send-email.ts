/**
 * Teacher Send Email API
 * POST /api/teacher/send-email
 *
 * Sends personalized emails to students in a cohort via Resend.
 * Each student receives an individual email with their name.
 * Reply-to is set to the teacher's email.
 */

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import {
  authenticateRequest,
  verifyTeacherOrAdminAccess,
  createServiceClient,
} from '../../../lib/auth';
import { escapeHTML } from '../../../lib/escape-html';
import { rateLimit, RateLimitPresets } from '../../../lib/rate-limiter';

export const prerender = false;

const FROM_EMAIL = 'C4C Campus <notifications@updates.codeforcompassion.com>';

function buildEmailHtml(studentName: string, bodyHtml: string, teacherName: string): string {
  const siteUrl = import.meta.env.SITE_URL || 'https://codeforcompassion.com';

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${siteUrl}/logo.jpeg" alt="C4C Campus" style="width: 60px; height: 60px; border-radius: 12px;" />
      </div>

      <p>Hi ${escapeHTML(studentName)},</p>

      <div style="margin: 20px 0; line-height: 1.6;">
        ${bodyHtml}
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

      <p style="color: #6b7280; font-size: 14px;">
        Sent by ${escapeHTML(teacherName)} via C4C Campus
      </p>
      <p style="color: #9ca3af; font-size: 14px;">
        C4C Campus - AI Development Accelerator for Animal Liberation
      </p>
    </div>
  `;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limit: 5 sends per minute
    const rateLimitResponse = await rateLimit(request, RateLimitPresets.forms);
    if (rateLimitResponse) return rateLimitResponse;

    // Lazy-initialize Resend — fail early if key not configured
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const resend = new Resend(resendApiKey);

    // Authenticate
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const supabase = createServiceClient();

    // Verify teacher role
    const isTeacherOrAdmin = await verifyTeacherOrAdminAccess(supabase, user.id);
    if (!isTeacherOrAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Teacher access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let body: { cohort_id: string; subject: string; body: string; recipient_user_ids: string[] };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { cohort_id, subject, body: emailBody, recipient_user_ids } = body;

    // Validate required fields
    if (!cohort_id || typeof cohort_id !== 'string') {
      return new Response(JSON.stringify({ error: 'cohort_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 200) {
      return new Response(JSON.stringify({ error: 'subject is required (max 200 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!emailBody || typeof emailBody !== 'string' || emailBody.trim().length === 0 || emailBody.length > 5000) {
      return new Response(JSON.stringify({ error: 'body is required (max 5000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Array.isArray(recipient_user_ids) || recipient_user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'recipient_user_ids must be a non-empty array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (recipient_user_ids.length > 100) {
      return new Response(JSON.stringify({ error: 'Maximum 100 recipients per send' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get teacher's role for admin bypass
    const { data: teacherApp } = await supabase
      .from('applications')
      .select('name, email, role')
      .eq('user_id', user.id)
      .single();

    if (!teacherApp) {
      return new Response(JSON.stringify({ error: 'Teacher profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify teacher owns this cohort
    const { data: cohort, error: cohortError } = await supabase
      .from('cohorts')
      .select('*, courses!inner(title, created_by)')
      .eq('id', cohort_id)
      .single();

    if (cohortError || !cohort) {
      return new Response(JSON.stringify({ error: 'Cohort not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (cohort.courses.created_by !== user.id && teacherApp.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Not your cohort' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify all recipients are enrolled in this cohort
    const { data: enrollments } = await supabase
      .from('cohort_enrollments')
      .select('user_id')
      .eq('cohort_id', cohort_id)
      .in('user_id', recipient_user_ids);

    const enrolledUserIds = new Set((enrollments || []).map(e => e.user_id));
    const validRecipientIds = recipient_user_ids.filter(id => enrolledUserIds.has(id));

    if (validRecipientIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid recipients found in this cohort' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch recipient names and emails
    const { data: recipients } = await supabase
      .from('applications')
      .select('user_id, name, email')
      .in('user_id', validRecipientIds);

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not find recipient details' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build the HTML body from teacher's text
    const bodyHtml = escapeHTML(emailBody).replace(/\n/g, '<br>');

    // Build individual emails
    const emails = recipients.map(recipient => ({
      from: FROM_EMAIL,
      to: recipient.email,
      replyTo: teacherApp.email,
      subject: subject.trim(),
      html: buildEmailHtml(recipient.name, bodyHtml, teacherApp.name),
    }));

    // Send via Resend batch API
    const { error: sendError } = await resend.batch.send(emails);

    if (sendError) {
      console.error('Resend batch send error:', sendError);
      return new Response(JSON.stringify({ error: 'Failed to send emails. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sent_count: recipients.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-email API:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
