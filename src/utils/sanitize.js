import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe HTML tags (formatting, tables, lists) but strips scripts and event handlers.
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML safe for dangerouslySetInnerHTML
 */
/**
 * Escape HTML special characters to prevent XSS when interpolating
 * plain text values into HTML template strings.
 *
 * @param {string} text - Plain text value
 * @returns {string} HTML-escaped string safe for interpolation
 */
export function escapeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHTML(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'blockquote', 'pre', 'code', 'hr', 'sup', 'sub'
    ],
    ALLOWED_ATTR: ['class', 'style', 'href', 'src', 'alt', 'target', 'rel', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
  });
}
