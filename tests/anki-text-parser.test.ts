import { describe, expect, it } from "vitest";
import { cleanAnkiHtml } from "../src/dictionary/parsers/htmlCleaner";
import { parseAnkiText } from "../src/dictionary/parsers/AnkiTextParser";
import { DictionaryImporter } from "../src/dictionary/DictionaryImporter";

describe("htmlCleaner", () => {
  it("strips HTML tags", () => {
    expect(cleanAnkiHtml("<b>hello</b>")).toBe("hello");
  });

  it("converts break tags to spaces", () => {
    expect(cleanAnkiHtml("line1<br>line2")).toBe("line1 line2");
    expect(cleanAnkiHtml("a<p>b</p>c")).toBe("a b c");
    expect(cleanAnkiHtml("a</div>b")).toBe("a b");
  });

  it("removes Anki media references", () => {
    expect(cleanAnkiHtml("word [sound:example.mp3]")).toBe("word");
  });

  it("decodes basic HTML entities", () => {
    expect(cleanAnkiHtml("hello&nbsp;world")).toBe("hello world");
    expect(cleanAnkiHtml("a&amp;b")).toBe("a&b");
    expect(cleanAnkiHtml("a&lt;b&gt;")).toBe("a<b>");
  });

  it("collapses multiple spaces", () => {
    expect(cleanAnkiHtml("a   b")).toBe("a b");
  });
});

describe("AnkiTextParser", () => {
  it("parses tab-separated fields into word and meaning", () => {
    const rows = parseAnkiText("robust\tstrong\nmeticulous\tcareful");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "strong" });
    expect(rows[1]).toMatchObject({ word: "meticulous", meaning: "careful" });
  });

  it("merges extra columns into meaning", () => {
    const rows = parseAnkiText("robust\tstrong\tadj.");
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "strong / adj." });
  });

  it("skips empty columns when merging meaning", () => {
    const rows = parseAnkiText("robust\t\tstrong\t");
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "strong" });
  });

  it("falls back to word-only when no tabs are present", () => {
    const rows = parseAnkiText("meticulous\n\nscrutiny");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ word: "meticulous" });
    expect(rows[0].meaning).toBeUndefined();
    expect(rows[1]).toMatchObject({ word: "" });
    expect(rows[2]).toMatchObject({ word: "scrutiny" });
  });

  it("cleans HTML in word and meaning fields", () => {
    const rows = parseAnkiText("<b>concise</b>\tclear<br>brief [sound:x.mp3]");
    expect(rows[0]).toMatchObject({ word: "concise", meaning: "clear brief" });
  });
});

describe("DictionaryImporter with anki-text", () => {
  const importer = new DictionaryImporter();

  it("imports anki-text TSV content", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "robust\tstrong\nmeticulous\tcareful",
      format: "anki-text",
      dictionaryName: "AnkiVocab",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.successCount).toBe(2);
    expect(result.snapshot?.entries[0]).toMatchObject({
      normalizedWord: "robust",
      meaning: "strong"
    });
  });

  it("rejects empty dictionary name", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "robust\tstrong",
      format: "anki-text",
      dictionaryName: "",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.successCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deduplicates by normalized word, keeping last occurrence", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "robust\tfirst\nrobust\tsecond",
      format: "anki-text",
      dictionaryName: "Test",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.snapshot?.entries).toHaveLength(1);
    expect(result.snapshot?.entries[0].meaning).toBe("second");
  });
});
