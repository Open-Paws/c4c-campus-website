import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import {
  authenticateRequest,
  verifyAdminAccess,
  createServiceClient,
} from '../../../lib/auth';

export const prerender = false;

const resendApiKey = import.meta.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

function generateEmailTemplate(heading: string, bodyContent: string, ctaButton?: { text: string; url: string }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDF4FF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF4FF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="https://www.codeforcompassion.com/logo.jpeg" alt="C4C Campus" width="48" height="48" style="display: block; border-radius: 8px;">
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1F2937;">${heading}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding-bottom: 24px;">
              ${bodyContent}
            </td>
          </tr>
          ${ctaButton ? `
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${ctaButton.url}" style="display: inline-block; background-color: #10b981; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                ${ctaButton.text}
              </a>
            </td>
          </tr>
          ` : ''}
        </table>
        <!-- Sub-footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; padding-top: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                Code for Compassion Campus - AI Development for Animal Liberation
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check Resend configuration
    if (!resendApiKey) {
      console.error('[update-application-status] Missing RESEND_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate: verify JWT signature + extract user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const supabase = createServiceClient();

    const isAdmin = await verifyAdminAccess(supabase, user.id);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { application_ids, status, decision_note, send_email } = await request.json();

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'application_ids array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['approved', 'rejected', 'waitlisted', 'pending'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build base update object
    const updateData: Record<string, any> = {
      status,
      decision_note: decision_note || null,
      reviewed_at: new Date().toISOString()
    };

    // For approved status, we need to set role to 'student' only for applications
    // that don't already have a role (to avoid demoting admins/teachers)
    let updatedApps: any[] | null = null;
    let updateError: any = null;

    if (status === 'approved') {
      // First, fetch applications to check their current roles
      // Only set role to 'student' for those with null role
      const { data: existingApps, error: fetchError } = await supabase
        .from('applications')
        .select('id, role')
        .in('id', application_ids);

      if (fetchError) {
        console.error('Failed to fetch applications for role check:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch applications' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Separate applications by whether they need role assignment
      const needsRoleAssignment = existingApps?.filter(a => a.role === null).map(a => a.id) ?? [];
      const hasExistingRole = existingApps?.filter(a => a.role !== null).map(a => a.id) ?? [];

      // Update applications that need role assignment (set role to 'student')
      if (needsRoleAssignment.length > 0) {
        const { error } = await supabase
          .from('applications')
          .update({ ...updateData, role: 'student' })
          .in('id', needsRoleAssignment);

        if (error) {
          console.error('Database update error (with role):', error);
          updateError = error;
        }
      }

      // Update applications that already have a role (don't change their role)
      if (hasExistingRole.length > 0 && !updateError) {
        const { error } = await supabase
          .from('applications')
          .update(updateData)
          .in('id', hasExistingRole);

        if (error) {
          console.error('Database update error (without role):', error);
          updateError = error;
        }
      }

      // Fetch the updated applications for email sending
      if (!updateError) {
        const { data, error } = await supabase
          .from('applications')
          .select('id, email, name, program')
          .in('id', application_ids);

        updatedApps = data;
        updateError = error;
      }
    } else {
      // For non-approved statuses, simple update without role change
      const { data, error } = await supabase
        .from('applications')
        .update(updateData)
        .in('id', application_ids)
        .select('id, email, name, program');

      updatedApps = data;
      updateError = error;
    }

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update applications' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send emails if requested
    let emailResults = { success: 0, failed: 0 };

    if (send_email && updatedApps && updatedApps.length > 0) {
      for (const app of updatedApps) {
        try {
          const programName = app.program === 'bootcamp' ? 'Weekend Bootcamp' :
                             app.program === 'accelerator' ? 'Full-Time Accelerator' : 'Hackathon';

          let subject = '';
          let heading = '';
          let bodyContent = '';
          let ctaButton: { text: string; url: string } | undefined;

          if (status === 'approved') {
            subject = 'Welcome to C4C Campus - Application Approved!';
            heading = `Congratulations, ${app.name}!`;
            bodyContent = `
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4B5563; text-align: center;">
                Your application to the <strong>${programName}</strong> has been approved!
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4B5563; text-align: center;">
                You can now log in to your dashboard and start exploring courses.
              </p>
              ${decision_note ? `
              <div style="background-color: #FDF4FF; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #6B7280;"><strong>Note from reviewer:</strong></p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #4B5563;">${decision_note}</p>
              </div>
              ` : ''}
            `;
            ctaButton = { text: 'Go to Dashboard', url: 'https://www.codeforcompassion.com/dashboard' };
          } else if (status === 'rejected') {
            subject = 'C4C Campus Application Update';
            heading = `Hi ${app.name}`;
            bodyContent = `
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4B5563; text-align: center;">
                Thank you for your interest in the ${programName}.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4B5563; text-align: center;">
                After careful review, we're unable to offer you a spot in this cohort. We encourage you to apply again in the future.
              </p>
              ${decision_note ? `
              <div style="background-color: #FDF4FF; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #6B7280;"><strong>Feedback:</strong></p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #4B5563;">${decision_note}</p>
              </div>
              ` : ''}
              <p style="margin: 0; font-size: 14px; line-height: 24px; color: #9CA3AF; text-align: center;">
                If you have questions, please reach out to info@codeforcompassion.com
              </p>
            `;
          } else {
            subject = 'C4C Campus Application - Waitlisted';
            heading = `Hi ${app.name}`;
            bodyContent = `
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4B5563; text-align: center;">
                Thank you for applying to the ${programName}.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4B5563; text-align: center;">
                Your application has been placed on our waitlist. We'll notify you as soon as a spot becomes available.
              </p>
              ${decision_note ? `
              <div style="background-color: #FDF4FF; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #6B7280;"><strong>Note:</strong></p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #4B5563;">${decision_note}</p>
              </div>
              ` : ''}
            `;
          }

          await resend.emails.send({
            from: 'C4C Campus <notifications@updates.codeforcompassion.com>',
            to: app.email,
            subject,
            html: generateEmailTemplate(heading, bodyContent, ctaButton)
          });
          emailResults.success++;
        } catch (emailError) {
          console.error('Email send error:', emailError);
          emailResults.failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: updatedApps?.length || 0,
        email_results: emailResults
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update application status error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
