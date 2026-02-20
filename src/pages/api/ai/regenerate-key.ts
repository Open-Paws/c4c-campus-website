import type { APIRoute } from 'astro';
import { authenticateRequest, createServiceClient } from '../../../lib/auth';
import { createStudentKey, deleteKey } from '../../../lib/openrouter';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
    const oldHash = currentPrefs.openrouter_key_hash as string | undefined;

    // Enforce cooldown via DB timestamp — survives serverless restarts unlike in-memory limits
    const cooldownHours = Number(import.meta.env.OPENROUTER_REGEN_COOLDOWN_HOURS) || 24;
    const lastRegen = currentPrefs.last_key_regenerated_at as string | undefined;
    if (lastRegen) {
      const elapsedHours = (Date.now() - new Date(lastRegen).getTime()) / (1000 * 60 * 60);
      if (elapsedHours < cooldownHours) {
        const msLeft = (cooldownHours * 60 * 60 * 1000) - (Date.now() - new Date(lastRegen).getTime());
        const availableAt = new Date(Date.now() + msLeft).toISOString();
        return new Response(
          JSON.stringify({
            error: 'Cooldown active',
            cooldownActive: true,
            availableAt,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Delete old key (best effort — don't block new provisioning on failure)
    if (oldHash) {
      try {
        await deleteKey(oldHash);
      } catch (err) {
        console.warn('[regenerate-key] Failed to delete old key, proceeding:', err);
      }
    }

    // Create new key with full weekly limit
    const { key, hash } = await createStudentKey(user.id);

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
      JSON.stringify({ success: true, fullKey: key }),
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
