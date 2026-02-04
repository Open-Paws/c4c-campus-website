/**
 * Astro Middleware Configuration
 *
 * Applies authentication, performance optimizations, and security headers to all requests
 */

import { sequence, defineMiddleware } from 'astro:middleware';
import { cacheMiddleware, compressionMiddleware, corsMiddleware } from './cache-middleware';
import { onRequest as authMiddleware } from './auth';

/**
 * Security headers middleware
 */
const securityMiddleware = defineMiddleware(async (_context, next) => {
  const response = await next();

  const headers = new Headers(response.headers);

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content Security Policy (adjust as needed)
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.google.com https://*.googleapis.com https://*.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' https://*.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://*.google.com; " +
    "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com; " +
    "frame-ancestors 'self';"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = defineMiddleware(async (context, next) => {
  const startTime = Date.now();

  const response = await next();

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Add server timing header
  const headers = new Headers(response.headers);
  headers.set('Server-Timing', `total;dur=${duration}`);

  // Log slow requests (> 1 second)
  if (duration > 1000) {
    console.warn(`[Performance] Slow request: ${context.url.pathname} took ${duration}ms`);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});

/**
 * Static asset caching middleware
 */
const staticAssetMiddleware = defineMiddleware(async (context, next) => {
  const { url } = context;

  // Check if this is a static asset
  const isStaticAsset =
    url.pathname.startsWith('/_astro/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/);

  if (isStaticAsset) {
    const response = await next();

    // Add long-term caching for static assets
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return next();
});

/**
 * Combine all middleware in sequence
 * Order: performance → cors → auth → static assets → cache → compression → security
 */
export const onRequest = sequence(
  performanceMiddleware,
  corsMiddleware,
  authMiddleware,
  staticAssetMiddleware,
  cacheMiddleware,
  compressionMiddleware,
  securityMiddleware
);
