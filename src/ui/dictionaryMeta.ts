import type { DictionaryEntry } from "../types";

export function formatDictionaryEntriesMeta(entries: DictionaryEntry[]): string {
  if (entries.length === 0) {
    return "Unknown";
  }

  return entries
    .map((entry) => `${entry.dictionaryName} · ${entry.difficulty}`)
    .join("\n");
}
