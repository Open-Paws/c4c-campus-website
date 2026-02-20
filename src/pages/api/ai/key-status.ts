import type { APIRoute } from 'astro';
import { authenticateRequest, createServiceClient } from '../../../lib/auth';
import { getKeyInfo, KeyNotFoundError } from '../../../lib/openrouter';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[key-status] Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
    const keyHash = prefs.openrouter_key_hash as string | undefined;

    if (!keyHash) {
      return new Response(
        JSON.stringify({ hasKey: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Compute regen cooldown
    const cooldownHours = Number(import.meta.env.OPENROUTER_REGEN_COOLDOWN_HOURS) || 24;
    const lastRegen = prefs.last_key_regenerated_at as string | undefined;
    let regenAvailableAt: string | null = null;
    if (lastRegen) {
      const msLeft = (cooldownHours * 60 * 60 * 1000) - (Date.now() - new Date(lastRegen).getTime());
      if (msLeft > 0) {
        regenAvailableAt = new Date(Date.now() + msLeft).toISOString();
      }
    }

    try {
      const info = await getKeyInfo(keyHash);

      return new Response(
        JSON.stringify({
          hasKey: true,
          limit: info.limit,
          limitRemaining: info.limit_remaining,
          usageWeekly: info.usage_weekly,
          disabled: info.disabled,
          regenAvailableAt,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      if (err instanceof KeyNotFoundError) {
        // Key was deleted on OpenRouter side — clear stale hash
        const { openrouter_key_hash: _, ...restPrefs } = prefs;
        await supabase
          .from('profiles')
          .update({ preferences: restPrefs })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ hasKey: false }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('[key-status] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch key status' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
