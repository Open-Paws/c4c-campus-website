/**
 * AI Key Widget — React island for the student dashboard.
 *
 * Auto-provisions an OpenRouter API key on first load.
 * Shows a one-time key reveal modal, then a usage visualization.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

type WidgetState = 'loading' | 'no_config' | 'provisioning' | 'ready' | 'error';

interface KeyStatus {
  limit: number;
  limitRemaining: number;
  usageWeekly: number;
  disabled: boolean;
  regenAvailableAt: string | null;
}

export default function AIKeyWidget() {
  const [state, setState] = useState<WidgetState>('loading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cooldownLeft, setCooldownLeft] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setState('error');
        setErrorMessage('Not authenticated');
      }
    });
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    const availableAt = keyStatus?.regenAvailableAt;
    if (!availableAt) {
      setCooldownLeft(null);
      return;
    }

    function tick() {
      const ms = new Date(availableAt!).getTime() - Date.now();
      if (ms <= 0) {
        setCooldownLeft(null);
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setCooldownLeft(`${h}h ${m}m`);
    }

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [keyStatus?.regenAvailableAt]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/key-status');

      if (res.status === 503) {
        setState('no_config');
        return;
      }

      if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);

      const data = await res.json();

      if (!data.hasKey) {
        // Only show error if we aren't already in a working state
        setState((prev) => {
          if (prev === 'ready') return prev;
          setErrorMessage('No API key found');
          return 'error';
        });
        return;
      }

      setKeyStatus({
        limit: data.limit,
        limitRemaining: data.limitRemaining,
        usageWeekly: data.usageWeekly,
        disabled: data.disabled,
        regenAvailableAt: data.regenAvailableAt ?? null,
      });
      setState('ready');
    } catch (err) {
      console.error('[AIKeyWidget] Status fetch error:', err);
      // Don't clobber a working widget on a background refresh failure
      setState((prev) => {
        if (prev === 'ready') return prev;
        setErrorMessage('Failed to load usage data');
        return 'error';
      });
    }
  }, []);

  // Once authenticated, check if key exists then provision only if needed
  useEffect(() => {
    if (!isAuthenticated) return;

    async function init() {
      setState('loading');
      try {
        // Check status first — avoids a POST on every dashboard load
        const statusRes = await fetch('/api/ai/key-status');

        if (statusRes.status === 503) {
          setState('no_config');
          return;
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.hasKey) {
            // Key already exists — just show usage
            await fetchStatus();
            return;
          }
        }

        // No key yet — provision one
        setState('provisioning');
        const res = await fetch('/api/ai/provision-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.status === 503) {
          setState('no_config');
          return;
        }

        if (!res.ok) {
          throw new Error(`Provision failed: ${res.status}`);
        }

        const data = await res.json();

        // Show the key if newly provisioned
        if (data.provisioned && data.fullKey) {
          setRevealKey(data.fullKey);
        }

        // Set ready immediately with defaults — key was just created
        const weeklyLimit = Number(import.meta.env.PUBLIC_OPENROUTER_STUDENT_WEEKLY_LIMIT) || 10;
        setKeyStatus({
          limit: weeklyLimit,
          limitRemaining: weeklyLimit,
          usageWeekly: 0,
          disabled: false,
          regenAvailableAt: null,
        });
        setState('ready');

        // Refresh usage in the background (don't block or error out)
        fetchStatus().catch(() => {});
      } catch (err) {
        console.error('[AIKeyWidget] Init error:', err);
        setState('error');
        setErrorMessage('Failed to set up AI key');
      }
    }

    init();
  }, [isAuthenticated, fetchStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleRegenerate = async () => {
    if (!confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }

    setRegenerating(true);
    setConfirmRegenerate(false);

    try {
      const res = await fetch('/api/ai/regenerate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 429) {
        const cooldownData = await res.json().catch(() => ({})) as { availableAt?: string };
        if (cooldownData.availableAt) {
          setKeyStatus((prev) => prev ? { ...prev, regenAvailableAt: cooldownData.availableAt! } : prev);
        }
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error || `Regenerate failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.fullKey) {
        setRevealKey(data.fullKey);
      }

      await fetchStatus();
    } catch (err) {
      console.error('[AIKeyWidget] Regenerate error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to regenerate key');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!revealKey) return;
    try {
      await navigator.clipboard.writeText(revealKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = revealKey;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dismissReveal = () => {
    setRevealKey(null);
    setCopied(false);
  };

  // Don't render anything if AI features aren't configured
  if (state === 'no_config') return null;

  // Loading skeleton
  if (state === 'loading' || state === 'provisioning') {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-xl">&#x26A0;</span>
            </div>
            <div>
              <p className="font-semibold text-red-700">AI Credits Unavailable</p>
              <p className="text-sm text-red-600">{errorMessage || 'Something went wrong'}</p>
            </div>
          </div>
          <button
            onClick={() => { setState('loading'); setErrorMessage(''); fetchStatus(); }}
            className="btn btn-ghost btn-sm text-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Compute progress for the bar
  const limit = keyStatus?.limit ?? 10;
  const remaining = keyStatus?.limitRemaining ?? 0;
  const used = keyStatus?.usageWeekly ?? 0;
  const percentRemaining = limit > 0 ? (remaining / limit) * 100 : 0;

  let barColor = 'bg-green-500';
  let textColor = 'text-green-600';
  if (percentRemaining <= 20) {
    barColor = 'bg-red-500';
    textColor = 'text-red-600';
  } else if (percentRemaining <= 50) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-600';
  }

  return (
    <>
      {/* Key Reveal Modal */}
      {revealKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card max-w-lg w-full bg-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-xl">&#x1F511;</span>
              </div>
              <h3 className="text-lg font-bold">Your OpenRouter API Key</h3>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 font-medium">
                Save this key now. It will not be shown again.
              </p>
            </div>

            <div className="relative">
              <code className="block bg-gray-100 rounded-lg p-4 text-sm font-mono break-all pr-16">
                {revealKey}
              </code>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <p>Weekly budget: <strong>${limit.toFixed(2)}</strong> (resets automatically)</p>
              <p>Use this key with any OpenRouter-compatible app or API.</p>
            </div>

            <button
              onClick={dismissReveal}
              className="mt-6 w-full btn btn-primary"
            >
              I've saved my key
            </button>
          </div>
        </div>
      )}

      {/* Usage Widget */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-xl">&#x2728;</span>
            </div>
            <div>
              <h3 className="font-semibold">AI Credits</h3>
              <p className="text-xs text-text-muted">OpenRouter API key &middot; resets weekly</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost btn-sm text-text-muted"
            title="Refresh usage"
          >
            {refreshing ? (
              <span className="inline-block animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
            ) : (
              '\u21BB'
            )}
          </button>
        </div>

        {/* Disabled warning */}
        {keyStatus?.disabled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700 font-medium">
              Key suspended — contact your instructor.
            </p>
          </div>
        )}

        {/* Budget display */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className={`text-2xl font-bold ${textColor}`}>
              ${remaining.toFixed(2)}
            </span>
            <span className="text-sm text-text-muted">
              of ${limit.toFixed(2)}/week
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.max(percentRemaining, 0)}%` }}
            />
          </div>

          <div className="flex justify-between mt-1.5 text-xs text-text-muted">
            <span>Used this week: ${used.toFixed(2)}</span>
            <span>{percentRemaining.toFixed(0)}% remaining</span>
          </div>
        </div>

        {/* Actions */}
        {cooldownLeft ? (
          <div className="flex items-center gap-2 text-sm text-text-muted bg-gray-50 rounded-lg p-3">
            <span className="inline-block h-4 w-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin"></span>
            <span>Key regeneration available in <strong className="text-gray-700">{cooldownLeft}</strong></span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className={`btn btn-sm flex-1 ${
                  confirmRegenerate
                    ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                    : 'btn-ghost'
                }`}
              >
                {regenerating
                  ? 'Regenerating...'
                  : confirmRegenerate
                    ? 'Confirm — old key will stop working'
                    : 'Regenerate Key'}
              </button>
            </div>

            {confirmRegenerate && (
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="mt-2 w-full btn btn-ghost btn-sm text-text-muted"
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
