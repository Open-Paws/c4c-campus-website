import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use cookies for auth storage so server-side middleware can access the session
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        // Try localStorage first (with try-catch for private browsing mode)
        try {
          const localValue = localStorage.getItem(key);
          if (localValue) return localValue;
        } catch {
          // localStorage not available (private browsing, etc.)
        }

        // Fall back to cookies
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
        // Use substring to handle values containing '=' (e.g., base64 tokens)
        return cookie ? decodeURIComponent(cookie.substring(cookie.indexOf('=') + 1)) : null;
      },
      setItem: (key: string, value: string) => {
        // Store in localStorage (with try-catch for private browsing mode)
        try {
          localStorage.setItem(key, value);
        } catch {
          // localStorage not available - cookies will still work
        }
        // Set cookie with secure attributes for production
        // 7 days (604800 seconds) - shorter session for security
        const isSecure = window.location.protocol === 'https:';
        const cookieValue = encodeURIComponent(value);
        document.cookie = `${key}=${cookieValue}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // localStorage not available
        }
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
