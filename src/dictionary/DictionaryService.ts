import type {
  CustomDictionarySnapshot,
  DictionaryEntry,
  LexiNoteSettings
} from "../types";

export class DictionaryService {
  private builtInEntries = new Map<string, DictionaryEntry>();
  private effectiveEntries = new Map<string, DictionaryEntry>();
  private customSnapshot?: CustomDictionarySnapshot;

  loadBuiltIn(entries: DictionaryEntry[]): void {
    this.builtInEntries = this.toEntryMap(entries);
    this.effectiveEntries = new Map(this.builtInEntries);
  }

  setCustomSnapshot(snapshot?: CustomDictionarySnapshot): void {
    this.customSnapshot = this.isValidSnapshot(snapshot) ? snapshot : undefined;
  }

  rebuildEffectiveDictionary(settings: LexiNoteSettings): void {
    const nextEntries = new Map(this.builtInEntries);

    if (settings.dictionarySource === "custom" && this.customSnapshot) {
      for (const entry of this.customSnapshot.entries) {
        if (this.isValidEntry(entry)) {
          nextEntries.set(entry.normalizedWord, entry);
        }
      }
    }

    this.effectiveEntries = nextEntries;
  }

  lookup(normalizedWord: string): DictionaryEntry | undefined {
    return this.effectiveEntries.get(normalizedWord.toLowerCase());
  }

  getAllEntries(): DictionaryEntry[] {
    return Array.from(this.effectiveEntries.values());
  }

  private toEntryMap(entries: DictionaryEntry[]): Map<string, DictionaryEntry> {
    const entryMap = new Map<string, DictionaryEntry>();

    for (const entry of entries) {
      if (this.isValidEntry(entry)) {
        entryMap.set(entry.normalizedWord, entry);
      }
    }

    return entryMap;
  }

  private isValidSnapshot(
    snapshot?: CustomDictionarySnapshot
  ): snapshot is CustomDictionarySnapshot {
    return Boolean(snapshot && Array.isArray(snapshot.entries));
  }

  private isValidEntry(entry: DictionaryEntry): boolean {
    return (
      typeof entry.word === "string" &&
      typeof entry.normalizedWord === "string" &&
      entry.normalizedWord.length > 0 &&
      typeof entry.dictionaryName === "string" &&
      Number.isFinite(entry.difficulty) &&
      entry.difficulty > 0
    );
  }
}
