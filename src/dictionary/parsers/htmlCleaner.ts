const BREAK_TAGS = /<\/?(br|p|div|li|tr|h[1-6])\s*\/?>/gi;
const TAG_PATTERN = /<[^>]*>/g;
const MEDIA_PATTERN = /\[sound:[^\]]*\]/gi;
const ENTITY_PATTERN = /&(nbsp|amp|lt|gt|quot|apos);/g;

const ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};

export function cleanAnkiHtml(raw: string): string {
  return raw
    .replace(BREAK_TAGS, " ")
    .replace(TAG_PATTERN, "")
    .replace(MEDIA_PATTERN, "")
    .replace(ENTITY_PATTERN, (_, entity: string) => ENTITY_MAP[entity] ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
