import type { DictionaryEntry } from "../types";

export function formatDictionaryEntriesMeta(
  entries: DictionaryEntry[],
  unknownLabel = "Unknown"
): string {
  if (entries.length === 0) {
    return unknownLabel;
  }

  return entries
    .map((entry) => `${entry.dictionaryName} · ${entry.difficulty}`)
    .join("\n");
}
