import pb from './pocketbase';
import { WishlistItem } from '../types';

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
 * Allows http:, https:, local blob: URLs, data:image URLs, and root-relative paths.
 */
export function isSafeImageUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;

  // Local object URLs or base64 image data
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:image/')) {
    return true;
  }

  // Root-relative paths (e.g. /api/files/...) but not protocol-relative (//)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Resolves the displayable image URL for a wishlist item.
 * Prioritizes the uploaded PocketBase file if available, falling back to external image_url.
 */
export function getItemImageUrl(item: WishlistItem): string | null {
  if (item.image) {
    try {
      const fileUrl = pb.files.getURL(item, item.image);
      if (fileUrl && isSafeImageUrl(fileUrl)) {
        return fileUrl;
      }
    } catch {
      // Fall through to image_url on error
    }
  }

  if (item.image_url && isSafeImageUrl(item.image_url)) {
    return item.image_url;
  }

  return null;
}

