import type {
  CustomDictionarySnapshot,
  DictionaryEntry,
  LexiNoteSettings
} from "../types";

interface DictionaryBucket {
  id: string;
  entries: DictionaryEntry[];
  order: number;
  enabled: boolean;
}

export class DictionaryService {
  private builtInEntries: DictionaryEntry[] = [];
  private effectiveEntries = new Map<string, DictionaryEntry[]>();
  private customSnapshots: CustomDictionarySnapshot[] = [];

  loadBuiltIn(entries: DictionaryEntry[]): void {
    this.builtInEntries = entries
      .filter((entry) => this.isValidEntry(entry))
      .map((entry) => this.withDictionaryId(entry, this.getBuiltInDictionaryId(entry)));
    this.rebuildEffectiveDictionary({
      enabledDictionaryIds: Array.from(
        new Set(this.builtInEntries.map((entry) => entry.dictionaryId).filter(Boolean))
      ) as string[],
      dictionaryOrder: Array.from(
        new Set(this.builtInEntries.map((entry) => entry.dictionaryId).filter(Boolean))
      ) as string[],
      userDifficulty: 1,
      highlightColor: "#fff3a3",
      highlightStyle: "background",
      underlineStyle: "solid",
      hideKnownWords: true,
      fallbackApiEnabled: false
    });
  }

  setCustomSnapshot(snapshot?: CustomDictionarySnapshot): void {
    this.setCustomSnapshots(snapshot ? [snapshot] : []);
  }

  setCustomSnapshots(snapshots?: CustomDictionarySnapshot[]): void {
    this.customSnapshots = Array.isArray(snapshots)
      ? snapshots.filter((snapshot) => this.isValidSnapshot(snapshot))
      : [];
  }

  rebuildEffectiveDictionary(settings: LexiNoteSettings): void {
    const nextEntries = new Map<string, DictionaryEntry[]>();
    const buckets = this.getOrderedBuckets(settings);

    for (const bucket of buckets) {
      if (!bucket.enabled) {
        continue;
      }

      for (const entry of bucket.entries) {
        if (!this.isValidEntry(entry)) {
          continue;
        }

        const normalizedWord = entry.normalizedWord.toLowerCase();
        const existingEntries = nextEntries.get(normalizedWord) ?? [];
        existingEntries.push(this.withDictionaryId(entry, bucket.id));
        nextEntries.set(normalizedWord, existingEntries);
      }
    }

    this.effectiveEntries = nextEntries;
  }

  lookup(normalizedWord: string): DictionaryEntry | undefined {
    return this.lookupAll(normalizedWord)[0];
  }

  lookupAll(normalizedWord: string): DictionaryEntry[] {
    return this.effectiveEntries.get(normalizedWord.toLowerCase()) ?? [];
  }

  getAllEntries(): DictionaryEntry[] {
    return Array.from(this.effectiveEntries.values()).flat();
  }

  getDictionaryRows(settings: LexiNoteSettings): Array<{
    id: string;
    name: string;
    source: "built-in" | "custom";
    difficulty: number;
    entryCount: number;
    enabled: boolean;
    order: number;
    readonly: boolean;
  }> {
    return this.getOrderedBuckets(settings).map((bucket, index) => {
      const firstEntry = bucket.entries[0];
      const source = firstEntry?.source === "custom" ? "custom" : "built-in";

      return {
        id: bucket.id,
        name: firstEntry?.dictionaryName ?? bucket.id,
        source,
        difficulty: firstEntry?.difficulty ?? 0,
        entryCount: bucket.entries.length,
        enabled: bucket.enabled,
        order: index,
        readonly: source === "built-in"
      };
    });
  }

  private getOrderedBuckets(settings: LexiNoteSettings): DictionaryBucket[] {
    const buckets = [
      ...Array.from(this.groupBuiltInEntries().values()),
      ...this.customSnapshots.map((snapshot) => ({
        id: snapshot.id,
        entries: snapshot.entries.map((entry) => ({
          ...entry,
          dictionaryName: snapshot.dictionaryName,
          dictionaryId: snapshot.id,
          source: "custom" as const
        })),
        order: snapshot.order,
        enabled: snapshot.enabled
      }))
    ];
    const enabledIds = this.getEnabledDictionaryIds(settings, buckets);
    const orderMap = new Map(
      (Array.isArray(settings.dictionaryOrder) ? settings.dictionaryOrder : []).map(
        (id, index) => [id, index]
      )
    );

    return buckets
      .map((bucket) => ({
        ...bucket,
        enabled: enabledIds.has(bucket.id)
      }))
      .sort((left, right) => {
        const leftOrder = orderMap.get(left.id) ?? left.order + buckets.length;
        const rightOrder = orderMap.get(right.id) ?? right.order + buckets.length;
        return leftOrder - rightOrder;
      });
  }

  private getEnabledDictionaryIds(
    settings: LexiNoteSettings,
    buckets: DictionaryBucket[]
  ): Set<string> {
    if (Array.isArray(settings.enabledDictionaryIds)) {
      return new Set(settings.enabledDictionaryIds);
    }

    if (settings.dictionarySource === "custom-only") {
      return new Set(
        buckets
          .filter((bucket) => bucket.entries.some((entry) => entry.source === "custom"))
          .map((bucket) => bucket.id)
      );
    }

    if (settings.dictionarySource === "built-in-custom") {
      return new Set(buckets.map((bucket) => bucket.id));
    }

    return new Set(
      buckets
        .filter((bucket) => bucket.entries.some((entry) => entry.source === "built-in"))
        .map((bucket) => bucket.id)
    );
  }

  private groupBuiltInEntries(): Map<string, DictionaryBucket> {
    const buckets = new Map<string, DictionaryBucket>();

    for (const entry of this.builtInEntries) {
      const id = this.getBuiltInDictionaryId(entry);
      const bucket = buckets.get(id) ?? {
        id,
        entries: [],
        order: buckets.size,
        enabled: true
      };

      if (this.isValidEntry(entry)) {
        bucket.entries.push(this.withDictionaryId(entry, id));
      }

      buckets.set(id, bucket);
    }

    return buckets;
  }

  private isValidSnapshot(
    snapshot?: CustomDictionarySnapshot
  ): snapshot is CustomDictionarySnapshot {
    return Boolean(
      snapshot &&
        typeof snapshot.id === "string" &&
        snapshot.id.length > 0 &&
        Array.isArray(snapshot.entries)
    );
  }

  private getBuiltInDictionaryId(entry: DictionaryEntry): string {
    return `built-in:${entry.dictionaryName}`;
  }

  private withDictionaryId(
    entry: DictionaryEntry,
    dictionaryId: string
  ): DictionaryEntry {
    return {
      ...entry,
      dictionaryId
    };
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
