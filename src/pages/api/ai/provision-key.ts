import type { APIRoute } from 'astro';
import { authenticateRequest, createServiceClient } from '../../../lib/auth';
import { createStudentKey } from '../../../lib/openrouter';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Check if user already has a provisioned key
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[provision-key] Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};

    // Already provisioned — don't re-expose the key
    if (currentPrefs.openrouter_key_hash) {
      return new Response(
        JSON.stringify({
          provisioned: false,
          keyHash: currentPrefs.openrouter_key_hash,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a new key via OpenRouter Management API
    const { key, hash } = await createStudentKey(user.id);

    // Store the hash in preferences (merge to preserve existing prefs)
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
      console.error('[provision-key] Failed to store key hash:', updateError);
      // Key was created on OpenRouter but we failed to store the hash.
      // Return the key anyway so the student doesn't lose it.
    }

    return new Response(
      JSON.stringify({
        provisioned: true,
        keyHash: hash,
        fullKey: key,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[provision-key] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to provision API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
