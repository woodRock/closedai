export function truncateString(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "\n\n... (message truncated)";
}

export function parseJsonSafe(json: string): any {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}
