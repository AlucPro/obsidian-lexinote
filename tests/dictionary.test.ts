import { describe, expect, it } from "vitest";
import { DictionaryImporter } from "../src/dictionary/DictionaryImporter";
import { DictionaryService } from "../src/dictionary/DictionaryService";
import type {
  CustomDictionarySnapshot,
  DictionaryEntry,
  LexiNoteSettings
} from "../src/types";

const baseSettings: LexiNoteSettings = {
  userDifficulty: 4,
  highlightColor: "#ffd166",
  dictionarySource: "built-in-only",
  hideKnownWords: true,
  fallbackApiEnabled: false,
  fallbackApiEndpoint: "",
  fallbackApiKey: ""
};

function entry(
  word: string,
  difficulty: number,
  meaning: string,
  source: DictionaryEntry["source"] = "built-in"
): DictionaryEntry {
  return {
    word,
    normalizedWord: word.toLowerCase(),
    dictionaryName: source === "built-in" ? "Built-in" : "Custom",
    difficulty,
    meaning,
    source
  };
}

function snapshot(entries: DictionaryEntry[]): CustomDictionarySnapshot {
  return {
    entries,
    importedAt: 1,
    sourceFileName: "custom.json",
    dictionaryName: "Custom",
    difficulty: 9,
    stats: {
      successCount: entries.length,
      failedCount: 0,
      skippedCount: 0
    }
  };
}

describe("DictionaryService", () => {
  it("uses built-in entries by default", () => {
    const service = new DictionaryService();

    service.loadBuiltIn([entry("robust", 7, "强健的")]);
    service.rebuildEffectiveDictionary(baseSettings);

    expect(service.lookup("robust")?.meaning).toBe("强健的");
  });

  it("lets custom entries override built-in entries in built-in + custom mode", () => {
    const service = new DictionaryService();

    service.loadBuiltIn([entry("robust", 7, "强健的")]);
    service.setCustomSnapshot(snapshot([entry("robust", 9, "自定义释义", "custom")]));
    service.rebuildEffectiveDictionary({
      ...baseSettings,
      dictionarySource: "built-in-custom"
    });

    expect(service.lookup("robust")).toMatchObject({
      meaning: "自定义释义",
      source: "custom",
      difficulty: 9
    });
  });

  it("ignores custom entries in built-in only mode", () => {
    const service = new DictionaryService();

    service.loadBuiltIn([entry("robust", 7, "强健的")]);
    service.setCustomSnapshot(snapshot([entry("robust", 9, "自定义释义", "custom")]));
    service.rebuildEffectiveDictionary(baseSettings);

    expect(service.lookup("robust")).toMatchObject({
      meaning: "强健的",
      source: "built-in"
    });
  });

  it("uses only custom entries in custom only mode", () => {
    const service = new DictionaryService();

    service.loadBuiltIn([entry("robust", 7, "强健的")]);
    service.setCustomSnapshot(snapshot([entry("meticulous", 9, "细致的", "custom")]));
    service.rebuildEffectiveDictionary({
      ...baseSettings,
      dictionarySource: "custom-only"
    });

    expect(service.lookup("robust")).toBeUndefined();
    expect(service.lookup("meticulous")?.meaning).toBe("细致的");
  });
});

describe("DictionaryImporter", () => {
  const importer = new DictionaryImporter();

  it("imports JSON rows and ignores old level fields", () => {
    const result = importer.import({
      fileName: "custom.json",
      content: JSON.stringify([
        {
          word: "methodology",
          meaning: "方法论",
          level: "CET6"
        }
      ]),
      format: "json",
      dictionaryName: "Academic",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.snapshot?.entries[0]).toMatchObject({
      normalizedWord: "methodology",
      meaning: "方法论",
      difficulty: 8
    });
  });

  it("imports CSV rows", () => {
    const result = importer.import({
      fileName: "custom.csv",
      content: "word,meaning\nconcise,简洁的\nverbose,冗长的",
      format: "csv",
      dictionaryName: "Writing",
      difficulty: 7,
      importedAt: 10
    });

    expect(result.successCount).toBe(2);
    expect(result.snapshot?.entries.map((item) => item.normalizedWord)).toEqual([
      "concise",
      "verbose"
    ]);
  });

  it("imports TXT rows without meanings", () => {
    const result = importer.import({
      fileName: "custom.txt",
      content: "meticulous\n\nscrutiny",
      format: "txt",
      dictionaryName: "Plain",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.successCount).toBe(2);
    expect(result.skippedCount).toBe(1);
    expect(result.snapshot?.entries[0].meaning).toBeUndefined();
  });

  it("keeps the last duplicate word", () => {
    const result = importer.import({
      fileName: "custom.csv",
      content: "word,meaning\nrobust,旧释义\nRobust,新释义",
      format: "csv",
      dictionaryName: "Writing",
      difficulty: 7,
      importedAt: 10
    });

    expect(result.snapshot?.entries).toHaveLength(1);
    expect(result.snapshot?.entries[0]).toMatchObject({
      word: "Robust",
      normalizedWord: "robust",
      meaning: "新释义"
    });
  });

  it("rejects invalid import difficulty", () => {
    const result = importer.import({
      fileName: "custom.txt",
      content: "robust",
      format: "txt",
      dictionaryName: "Plain",
      difficulty: 0,
      importedAt: 10
    });

    expect(result.snapshot).toBeUndefined();
    expect(result.failedCount).toBe(1);
  });
});
