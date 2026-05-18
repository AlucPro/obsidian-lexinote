import { describe, expect, it } from "vitest";
import { DictionaryImporter } from "../src/dictionary/DictionaryImporter";
import { VocabularyExporter } from "../src/vocabulary/VocabularyExporter";
import type { FavoriteWord } from "../src/types";

function favorite(overrides: Partial<FavoriteWord>): FavoriteWord {
  return {
    word: "robust",
    normalizedWord: "robust",
    meaning: "强健的",
    dictionaryName: "CET6",
    difficulty: 6,
    createdAt: 100,
    updatedAt: 100,
    known: false,
    ...overrides
  };
}

describe("VocabularyExporter", () => {
  const exporter = new VocabularyExporter();

  it("exports favorites as a LexiNote JSON dictionary that can be re-imported", () => {
    const content = exporter.exportAsLexiNoteJson([
      favorite({ word: "Robust", normalizedWord: "robust" }),
      favorite({
        word: "peculiar",
        normalizedWord: "peculiar",
        meaning: undefined,
        difficulty: undefined
      })
    ]);

    expect(JSON.parse(content)).toEqual([
      {
        word: "Robust",
        meaning: "强健的",
        difficulty: 6,
        dictionaryName: "My vocabulary"
      },
      {
        word: "peculiar",
        meaning: "",
        dictionaryName: "My vocabulary"
      }
    ]);

    const imported = new DictionaryImporter().import({
      fileName: "lexinote-vocabulary.json",
      content,
      format: "json",
      dictionaryName: "Imported favorites",
      difficulty: 8,
      importedAt: 1
    });

    expect(imported.successCount).toBe(2);
    expect(imported.snapshot?.entries.map((entry) => entry.normalizedWord)).toEqual([
      "robust",
      "peculiar"
    ]);
  });

  it("exports favorites as Anki TSV and sanitizes field separators", () => {
    const content = exporter.exportAsAnkiTsv([
      favorite({
        word: "line\tbreak",
        normalizedWord: "line break",
        meaning: "first line\nsecond\tfield"
      }),
      favorite({
        word: "empty",
        normalizedWord: "empty",
        meaning: undefined
      })
    ]);

    expect(content).toBe(
      [
        "word\tmeaning",
        "line break\tfirst line second field",
        "empty\t"
      ].join("\n")
    );
  });

  it("creates stable export file names from a date", () => {
    const date = new Date("2026-05-18T12:30:00Z");

    expect(exporter.createFileName("lexinote-json", date)).toBe(
      "lexinote-vocabulary-20260518.json"
    );
    expect(exporter.createFileName("anki-tsv", date)).toBe(
      "lexinote-anki-20260518.tsv"
    );
  });
});
