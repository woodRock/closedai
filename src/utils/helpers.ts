/**
 * @fileoverview General utility helper functions.
 */

/**
 * Truncates a string to a maximum length and appends a truncation message if needed.
 *
 * @param text - The string to truncate.
 * @param maxLength - The maximum allowed length.
 * @returns The truncated or original string.
 */
export function truncateString(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '\n\n... (message truncated)'
}

/**
 * Safely parses a JSON string, returning null if parsing fails.
 *
 * @param json - The JSON string to parse.
 * @returns The parsed object or null.
 */
export function parseJsonSafe(json: string): any {
  try {
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}
