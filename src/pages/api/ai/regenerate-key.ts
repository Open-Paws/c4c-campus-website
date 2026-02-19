import type { APIRoute } from 'astro';
import { authenticateRequest, createServiceClient } from '../../../lib/auth';
import { createStudentKey, deleteKey } from '../../../lib/openrouter';
import { rateLimit, RateLimitPresets } from '../../../lib/rate-limiter';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limit: 10 regenerations per hour
    const rateLimitResponse = await rateLimit(request, RateLimitPresets.expensive);
    if (rateLimitResponse) return rateLimitResponse;

    if (!import.meta.env.OPENROUTER_MANAGEMENT_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI features not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const supabase = createServiceClient();

    // Read existing hash
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
    const oldHash = currentPrefs.openrouter_key_hash as string | undefined;

    // Delete old key if it exists (best effort — don't block on failure)
    if (oldHash) {
      try {
        await deleteKey(oldHash);
      } catch (err) {
        console.warn('[regenerate-key] Failed to delete old key, proceeding:', err);
      }
    }

    // Create new key
    const { key, hash } = await createStudentKey(user.id);

    // Store new hash
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          preferences: {
            ...currentPrefs,
            openrouter_key_hash: hash,
          },
        },
        { onConflict: 'id' }
      );

    if (updateError) {
      console.error('[regenerate-key] Failed to store new key hash:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fullKey: key,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[regenerate-key] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to regenerate API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
