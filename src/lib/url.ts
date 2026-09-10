/**
 * Utility functions for validating and sanitizing user-provided URLs
 * to prevent XSS (e.g. javascript: schemes) and React render crashes from malformed URLs.
 */

export interface SafeUrlResult {
  href: string;
  hostname: string;
}

/**
 * Validates and safely parses an external URL.
 * Automatically adds https:// if protocol was omitted (e.g. "amazon.com/item").
 * Returns null if the URL is invalid or uses a dangerous scheme (like javascript: or data:).
 */
export function getSafeUrl(urlStr?: string | null): SafeUrlResult | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const trimmed = urlStr.trim();
  if (!trimmed) return null;

  try {
    // If protocol is missing, prepend https://
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);

    // Only allow standard http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        href: parsed.href,
        hostname: parsed.hostname.replace(/^www\./i, ''),
      };
    }
  } catch {
    // URL was malformed or failed parsing
  }

  return null;
}

/**
 * Checks if an image URL is safe to use in an <img> tag.
 * Restricts to http: and https: protocols only.
 */
export function isSafeImageUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
