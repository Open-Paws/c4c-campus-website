/**
 * Browser-safe HTML escaping utility.
 * Separated from security.ts to avoid pulling sanitize-html (Node.js module)
 * into client-side bundles.
 */

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
