import { describe, expect, it } from "vitest";
import { Analyzer } from "../src/analysis/Analyzer";
import { Normalizer } from "../src/analysis/Normalizer";
import { Tokenizer } from "../src/analysis/Tokenizer";
import { DictionaryService } from "../src/dictionary/DictionaryService";
import type { DictionaryEntry, FavoriteWord, LexiNoteSettings } from "../src/types";

const settings: LexiNoteSettings = {
  userDifficulty: 4,
  highlightColor: "#ffd166",
  dictionarySource: "built-in-only",
  hideKnownWords: true,
  fallbackApiEnabled: false,
  fallbackApiEndpoint: "",
  fallbackApiKey: ""
};

function entry(word: string, difficulty: number): DictionaryEntry {
  return {
    word,
    normalizedWord: word.toLowerCase(),
    dictionaryName: "Test",
    difficulty,
    meaning: `${word} meaning`,
    source: "built-in"
  };
}

function dictionary(entries: DictionaryEntry[]): DictionaryService {
  const service = new DictionaryService();

  service.loadBuiltIn(entries);
  service.rebuildEffectiveDictionary(settings);

  return service;
}

describe("Tokenizer and Normalizer", () => {
  it("tokenizes English words and keeps document ranges", () => {
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.tokenize("A robust test-case isn't tiny.", [
      {
        from: 2,
        to: 31
      }
    ]);

    expect(tokens.map((token) => token.word)).toEqual([
      "robust",
      "test",
      "case",
      "isn't",
      "tiny"
    ]);
    expect(tokens[0].range).toEqual({
      from: 2,
      to: 8
    });
  });

  it("normalizes casing and produces simple suffix lookup candidates", () => {
    const normalizer = new Normalizer();

    expect(normalizer.normalize("ROBUST")).toBe("robust");
    expect(normalizer.getLookupCandidates("tests")).toEqual(["tests", "test"]);
  });
});

describe("Analyzer", () => {
  it("detects words whose difficulty is above the user difficulty", () => {
    const analyzer = new Analyzer();
    const result = analyzer.analyze({
      filePath: "note.md",
      text: "A robust note uses current wording.",
      settings,
      dictionary: dictionary([entry("robust", 7), entry("current", 4)]),
      favorites: {}
    });

    expect(result.difficultWords.map((word) => word.normalizedWord)).toEqual([
      "robust"
    ]);
  });

  it("hides known favorite words when hideKnownWords is enabled", () => {
    const analyzer = new Analyzer();
    const favorite: FavoriteWord = {
      word: "robust",
      normalizedWord: "robust",
      meaning: "强健的",
      dictionaryName: "Test",
      difficulty: 7,
      createdAt: 1,
      updatedAt: 1,
      known: true
    };
    const result = analyzer.analyze({
      filePath: "note.md",
      text: "robust",
      settings,
      dictionary: dictionary([entry("robust", 7)]),
      favorites: {
        robust: favorite
      }
    });

    expect(result.difficultWords).toEqual([]);
  });

  it("excludes frontmatter, code, URLs, and wikilinks from analysis", () => {
    const analyzer = new Analyzer();
    const text = [
      "---",
      "title: robust",
      "---",
      "`robust`",
      "```",
      "robust",
      "```",
      "https://example.com/robust",
      "[[robust]]",
      "visible robust"
    ].join("\n");
    const result = analyzer.analyze({
      filePath: "note.md",
      text,
      settings,
      dictionary: dictionary([entry("robust", 7), entry("visible", 7)]),
      favorites: {}
    });

    expect(result.difficultWords.map((word) => word.normalizedWord)).toEqual([
      "visible",
      "robust"
    ]);
    expect(
      result.difficultWords.find((word) => word.normalizedWord === "robust")
        ?.occurrences
    ).toHaveLength(1);
  });

  it("deduplicates difficult words and preserves every occurrence", () => {
    const analyzer = new Analyzer();
    const result = analyzer.analyze({
      filePath: "note.md",
      text: "robust Robust robust",
      settings,
      dictionary: dictionary([entry("robust", 7)]),
      favorites: {}
    });

    expect(result.difficultWords).toHaveLength(1);
    expect(result.difficultWords[0].occurrences).toHaveLength(3);
  });
});
