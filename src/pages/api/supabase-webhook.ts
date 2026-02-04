import type { APIRoute } from 'astro';

/**
 * Supabase webhook handler for application status changes
 * This endpoint is called by Supabase when an application is approved
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const webhookSecret = import.meta.env.SUPABASE_WEBHOOK_SECRET;

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = await request.json();
    const { type, table, record, old_record } = payload;

    // Only handle application approvals
    if (table !== 'applications' || type !== 'UPDATE') {
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if status changed to approved
    if (record.status === 'approved' && old_record.status !== 'approved') {
      // TODO: Send welcome email to newly approved user
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
