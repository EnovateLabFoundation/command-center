/**
 * sanitize.ts
 *
 * DOMPurify wrapper for sanitising user-generated HTML content
 * before it is persisted to the database or rendered in the UI.
 *
 * Usage:
 *   import { sanitizeHtml, sanitizePlain } from '@/lib/sanitize';
 *
 *   // Clean rich-text HTML (keeps safe formatting tags)
 *   const clean = sanitizeHtml(userHtmlString);
 *
 *   // Strip ALL HTML — plain text only
 *   const text = sanitizePlain(userInput);
 */

import DOMPurify from 'dompurify';

/** Allowed HTML tags for rich-text fields (bio, descriptions, notes) */
const RICH_TEXT_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's',
  'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'a', 'span', 'pre', 'code',
];

/** Allowed HTML attributes for rich-text fields */
const RICH_TEXT_ATTRS = ['href', 'target', 'rel', 'class'];

/**
 * Sanitises HTML from a rich-text editor.
 * Keeps safe formatting tags, strips scripts/iframes/etc.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: RICH_TEXT_TAGS,
    ALLOWED_ATTR: RICH_TEXT_ATTRS,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false,
    // Force rel=noopener on external links
    FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed'],
  });
}

/**
 * Strips ALL HTML tags and returns plain text.
 * Use for fields that should never contain markup (names, titles, etc.)
 */
export function sanitizePlain(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitises a URL string — allows only http(s) and relative URLs.
 * Returns empty string if the URL looks suspicious (javascript:, data:, etc.)
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  return url.trim();
}
