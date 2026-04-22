export function formatMeaningText(meaning: string | undefined, fallback: string): string {
  const source = meaning?.trim();

  if (!source) {
    return fallback;
  }

  return source
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\t/g, "\t");
}
