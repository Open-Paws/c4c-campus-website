import type { APIRoute } from 'astro';
import { authenticateRequest, createServiceClient } from '../../../lib/auth';
import { createStudentKey, deleteKey, getKeyInfo, KeyNotFoundError } from '../../../lib/openrouter';

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

    // Read existing profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
    const oldHash = currentPrefs.openrouter_key_hash as string | undefined;

    // Enforce cooldown via DB timestamp (works across serverless instances)
    const cooldownHours = Number(import.meta.env.OPENROUTER_REGEN_COOLDOWN_HOURS ?? 24);
    const lastRegen = currentPrefs.last_key_regenerated_at as string | undefined;
    if (lastRegen) {
      const elapsedHours = (Date.now() - new Date(lastRegen).getTime()) / (1000 * 60 * 60);
      if (elapsedHours < cooldownHours) {
        const hoursLeft = Math.ceil(cooldownHours - elapsedHours);
        return new Response(
          JSON.stringify({ error: `Please wait ${hoursLeft}h before regenerating again` }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch old key's usage before deleting so we can carry over spent budget
    let alreadySpent = 0;
    if (oldHash) {
      try {
        const info = await getKeyInfo(oldHash);
        alreadySpent = info.usage_weekly;
        await deleteKey(oldHash);
      } catch (err) {
        if (!(err instanceof KeyNotFoundError)) {
          console.warn('[regenerate-key] Failed to fetch/delete old key, proceeding:', err);
        }
      }
    }

    // New key gets remaining budget for the week (prevents bypass via regeneration)
    const weeklyLimit = Number(import.meta.env.OPENROUTER_STUDENT_WEEKLY_LIMIT ?? 10);
    const newLimit = Math.max(0, weeklyLimit - alreadySpent);

    // Create new key with adjusted limit
    const { key, hash } = await createStudentKey(user.id, newLimit);

    // Store new hash and regeneration timestamp
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          preferences: {
            ...currentPrefs,
            openrouter_key_hash: hash,
            last_key_regenerated_at: new Date().toISOString(),
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
