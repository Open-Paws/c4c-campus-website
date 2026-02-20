/**
 * OpenRouter Management API wrapper
 *
 * Server-only module for programmatic key provisioning.
 * Uses a Management API key (not a usage key) to create, read, and delete
 * per-student API keys with weekly spending limits.
 */

const OR_BASE = 'https://openrouter.ai/api/v1/keys';

function getManagementKey(): string {
  const key = import.meta.env.OPENROUTER_MANAGEMENT_KEY;
  if (!key) throw new Error('OPENROUTER_MANAGEMENT_KEY not configured');
  return key;
}

export interface ORKeyInfo {
  hash: string;
  label: string;
  name: string;
  limit: number;
  limit_remaining: number;
  usage: number;
  usage_weekly: number;
  disabled: boolean;
}

export interface ORCreateResult {
  key: string;
  hash: string;
}

/**
 * Create a new OpenRouter API key for a student.
 * Returns the full key string (one-time only) and the hash for storage.
 */
export async function createStudentKey(userId: string): Promise<ORCreateResult> {
  const weeklyLimit = Number(import.meta.env.OPENROUTER_STUDENT_WEEKLY_LIMIT) || 10;
  const response = await fetch(OR_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getManagementKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `c4c-student-${userId}`,
      limit: weeklyLimit,
      limitReset: 'weekly',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter key creation failed: ${response.status} — ${body}`);
  }

  const data = await response.json();

  // OpenRouter returns { data: { hash, ... }, key: "sk-or-v1-..." }
  // key is top-level, hash is nested inside data
  const key = data.key;
  const hash = data.data?.hash;

  if (!key || !hash) {
    console.error('[openrouter] Unexpected response format:', JSON.stringify(data, null, 2));
    throw new Error('OpenRouter returned unexpected response format');
  }

  return { key, hash };
}

/**
 * Fetch current usage and budget info for a key by its hash.
 */
export async function getKeyInfo(hash: string): Promise<ORKeyInfo> {
  const response = await fetch(`${OR_BASE}/${hash}`, {
    headers: {
      'Authorization': `Bearer ${getManagementKey()}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new KeyNotFoundError(hash);
    }
    const body = await response.text();
    throw new Error(`OpenRouter key lookup failed: ${response.status} — ${body}`);
  }

  const data = await response.json();
  const keyData = data.data ?? data;

  return {
    hash: keyData.hash,
    label: keyData.label ?? '',
    name: keyData.name ?? '',
    limit: keyData.limit ?? 10,
    limit_remaining: keyData.limit_remaining ?? 0,
    usage: keyData.usage ?? 0,
    usage_weekly: keyData.usage_weekly ?? 0,
    disabled: keyData.disabled ?? false,
  };
}

/**
 * Delete a key by hash. Used before regenerating.
 * Silently succeeds if the key is already gone (404).
 */
export async function deleteKey(hash: string): Promise<void> {
  const response = await fetch(`${OR_BASE}/${hash}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getManagementKey()}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`OpenRouter key deletion failed: ${response.status} — ${body}`);
  }
}

/**
 * Custom error for when a key hash no longer exists on OpenRouter's side.
 */
export class KeyNotFoundError extends Error {
  constructor(hash: string) {
    super(`OpenRouter key not found: ${hash}`);
    this.name = 'KeyNotFoundError';
  }
}
