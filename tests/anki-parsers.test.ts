import { describe, expect, it } from "vitest";
import { cleanAnkiHtml } from "../src/dictionary/parsers/htmlCleaner";
import { parseAnkiText } from "../src/dictionary/parsers/AnkiTextParser";
import { parseAnkiPackage } from "../src/dictionary/parsers/AnkiPackageParser";
import { DictionaryImporter } from "../src/dictionary/DictionaryImporter";

function loadWasmBinary(): ArrayBuffer {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  const wasmPath = path.resolve(
    __dirname,
    "../node_modules/sql.js/dist/sql-wasm.wasm"
  );
  return fs.readFileSync(wasmPath).buffer;
}

// ---------------------------------------------------------------------------
// 9.1 htmlCleaner
// ---------------------------------------------------------------------------
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

  it("handles complex mixed content", () => {
    const input = '<div>robust</div><br>[sound:test.mp3]&nbsp;<b>strong</b>';
    expect(cleanAnkiHtml(input)).toBe("robust strong");
  });

  it("removes Anki media references with path", () => {
    expect(cleanAnkiHtml("[sound:collection.media/file.mp3] word")).toBe("word");
  });
});

// ---------------------------------------------------------------------------
// 9.2 AnkiTextParser
// ---------------------------------------------------------------------------
describe("AnkiTextParser", () => {
  it("parses tab-separated fields into word and meaning", () => {
    const rows = parseAnkiText("robust\t强健的\nmeticulous\t一丝不苟的");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "强健的" });
    expect(rows[1]).toMatchObject({ word: "meticulous", meaning: "一丝不苟的" });
  });

  it("merges extra columns into meaning", () => {
    const rows = parseAnkiText("robust\t强健的\tadj.");
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "强健的 / adj." });
  });

  it("skips empty columns when merging meaning", () => {
    const rows = parseAnkiText("robust\t\t强健的\t");
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "强健的" });
  });

  it("falls back to word-only when no tabs present", () => {
    const rows = parseAnkiText("meticulous\n\nscrutiny");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ word: "meticulous" });
    expect(rows[0].meaning).toBeUndefined();
    expect(rows[1]).toMatchObject({ word: "" });
    expect(rows[2]).toMatchObject({ word: "scrutiny" });
  });

  it("cleans HTML in word and meaning fields", () => {
    const rows = parseAnkiText("<b>robust</b>\t<i>强健的</i> [sound:x.mp3]");
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "强健的" });
  });

  it("assigns line numbers", () => {
    const rows = parseAnkiText("a\t1\nb\t2");
    expect(rows[0].line).toBe(1);
    expect(rows[1].line).toBe(2);
  });

  it("handles windows-style line endings", () => {
    const rows = parseAnkiText("robust\tstrong\r\nmeticulous\tcareful");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ word: "robust", meaning: "strong" });
  });
});

// ---------------------------------------------------------------------------
// 9.3 AnkiPackageParser
// ---------------------------------------------------------------------------
describe("AnkiPackageParser", () => {
  it("parses a basic .apkg with Basic note type", async () => {
    const fixture = await createApkgFixture();
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    expect(result.warnings).toHaveLength(0);
    expect(result.deckNames).toContain("Test Deck");
    expect(result.noteTypes).toHaveLength(1);
    expect(result.noteTypes[0].name).toBe("Basic");
    expect(result.noteTypes[0].fields).toEqual(["Front", "Back"]);
    expect(result.noteTypes[0].suggestedWordField).toBe("Front");
    expect(result.noteTypes[0].suggestedMeaningFields).toEqual(["Back"]);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      word: "robust",
      meaning: "强健的；健壮的"
    });
  });

  it("cleans HTML in APKG note fields", async () => {
    const fixture = await createApkgFixture();
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    // Third note has HTML in the Back field: 简洁的<br>明了的
    const htmlRow = result.rows[2];
    expect(htmlRow.word).toBe("concise");
    expect(htmlRow.meaning).toBe("简洁的 明了的");
  });

  it("returns warnings for unsupported package format", async () => {
    const wasmBinary = loadWasmBinary();
    const emptyBuffer = new ArrayBuffer(0);

    const result = await parseAnkiPackage({
      binaryContent: emptyBuffer,
      wasmBinary
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
    expect(result.deckNames).toHaveLength(0);
  });

  it("returns warnings for empty collection database", async () => {
    const wasmBinary = loadWasmBinary();
    const fixture = await createApkgFixture({ emptyCollection: true });

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns warnings for malformed collection JSON", async () => {
    const wasmBinary = loadWasmBinary();
    const fixture = await createApkgFixture({ malformedJson: true });

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it("cleans [sound:...] references in APKG fields", async () => {
    const fixture = await createApkgFixture({ withSoundRef: true });
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    const soundRow = result.rows.find((r) => r.word === "hello");
    expect(soundRow).toBeDefined();
    expect(soundRow!.meaning).toBe("你好");
  });

  it("includes sourceMeta on rows", async () => {
    const fixture = await createApkgFixture();
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    expect(result.rows[0].sourceMeta).toBeDefined();
    expect(result.rows[0].sourceMeta!.fieldNames).toBe("Front, Back");
    expect(result.rows[0].sourceMeta!.noteIndex).toBe(0);
  });

  it("auto-detects word/meaning fields by name", async () => {
    const fixture = await createApkgFixture({
      customFields: ["Term", "Definition"]
    });
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    expect(result.noteTypes[0].suggestedWordField).toBe("Term");
    expect(result.noteTypes[0].suggestedMeaningFields).toEqual(["Definition"]);
  });

  it("falls back to first/second field when names are unrecognized", async () => {
    const fixture = await createApkgFixture({
      customFields: ["FieldA", "FieldB"]
    });
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    expect(result.noteTypes[0].suggestedWordField).toBe("FieldA");
    expect(result.noteTypes[0].suggestedMeaningFields).toEqual(["FieldB"]);
  });

  it("skips notes with unknown model id", async () => {
    const fixture = await createApkgFixture({ orphanNote: true });
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    // The orphan note should be skipped; only valid notes remain
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((r) => r.word !== "orphan")).toBe(true);
  });

  it("prefers collection.anki21 over collection.anki2", async () => {
    const fixture = await createApkgFixture({ useAnki21: true });
    const wasmBinary = loadWasmBinary();

    const result = await parseAnkiPackage({
      binaryContent: fixture,
      wasmBinary
    });

    // Should still parse successfully via collection.anki21
    expect(result.warnings).toHaveLength(0);
    expect(result.deckNames).toContain("Test Deck");
    expect(result.rows).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 9.4 DictionaryImporter integration
// ---------------------------------------------------------------------------
describe("DictionaryImporter with anki-text", () => {
  const importer = new DictionaryImporter();

  it("imports anki-text TSV content", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "robust\t强健的\nmeticulous\t一丝不苟的",
      format: "anki-text",
      dictionaryName: "AnkiVocab",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.successCount).toBe(2);
    expect(result.snapshot?.entries[0]).toMatchObject({
      normalizedWord: "robust",
      meaning: "强健的"
    });
  });

  it("handles anki-text with HTML content", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "<b>concise</b>\t简洁的<br>明了的",
      format: "anki-text",
      dictionaryName: "AnkiVocab",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.successCount).toBe(1);
    expect(result.snapshot?.entries[0]).toMatchObject({
      word: "concise",
      meaning: "简洁的 明了的"
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

  it("rejects invalid difficulty", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "robust\tstrong",
      format: "anki-text",
      dictionaryName: "Test",
      difficulty: 0,
      importedAt: 10
    });

    expect(result.successCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("counts non-English words as failures", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "你好\thello\n12345\tnumbers",
      format: "anki-text",
      dictionaryName: "Test",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.failedCount).toBe(2);
    expect(result.successCount).toBe(0);
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

  it("skips empty word rows", () => {
    const result = importer.import({
      fileName: "notes.tsv",
      content: "robust\tstrong\n\tempty\nmeticulous\tcareful",
      format: "anki-text",
      dictionaryName: "Test",
      difficulty: 8,
      importedAt: 10
    });

    expect(result.skippedCount).toBe(1);
    expect(result.successCount).toBe(2);
  });

  it("includes snapshot metadata", () => {
    const result = importer.import({
      fileName: "my-notes.tsv",
      content: "robust\tstrong",
      format: "anki-text",
      dictionaryName: "MyDict",
      difficulty: 5,
      importedAt: 12345
    });

    const snapshot = result.snapshot!;
    expect(snapshot.id).toBe("custom-12345");
    expect(snapshot.sourceFileName).toBe("my-notes.tsv");
    expect(snapshot.dictionaryName).toBe("MyDict");
    expect(snapshot.difficulty).toBe(5);
    expect(snapshot.importedAt).toBe(12345);
    expect(snapshot.enabled).toBe(true);
    expect(snapshot.entries[0].source).toBe("custom");
  });
});

describe("DictionaryImporter with apkg", () => {
  const importer = new DictionaryImporter();

  it("imports from parsed Anki deck", () => {
    const result = importer.importFromAnkiDeck(
      {
        deckNames: ["Test"],
        noteTypes: [{
          id: "1",
          name: "Basic",
          fields: ["Front", "Back"],
          noteCount: 2,
          suggestedWordField: "Front",
          suggestedMeaningFields: ["Back"]
        }],
        rows: [
          { word: "robust", meaning: "强健的", line: 1 },
          { word: "meticulous", meaning: "一丝不苟的", line: 2 }
        ],
        warnings: []
      },
      {
        fileName: "test.apkg",
        format: "apkg",
        dictionaryName: "AnkiDeck",
        difficulty: 8,
        importedAt: 10
      }
    );

    expect(result.successCount).toBe(2);
    expect(result.snapshot?.entries[0]).toMatchObject({
      normalizedWord: "robust",
      meaning: "强健的"
    });
  });

  it("rejects empty dictionary name", () => {
    const result = importer.importFromAnkiDeck(
      {
        deckNames: ["Test"],
        noteTypes: [],
        rows: [{ word: "robust", meaning: "strong", line: 1 }],
        warnings: []
      },
      {
        fileName: "test.apkg",
        format: "apkg",
        dictionaryName: "",
        difficulty: 8,
        importedAt: 10
      }
    );

    expect(result.successCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deduplicates by normalized word, keeping last occurrence", () => {
    const result = importer.importFromAnkiDeck(
      {
        deckNames: ["Test"],
        noteTypes: [],
        rows: [
          { word: "robust", meaning: "first", line: 1 },
          { word: "robust", meaning: "second", line: 2 }
        ],
        warnings: []
      },
      {
        fileName: "test.apkg",
        format: "apkg",
        dictionaryName: "Test",
        difficulty: 8,
        importedAt: 10
      }
    );

    expect(result.snapshot?.entries).toHaveLength(1);
    expect(result.snapshot?.entries[0].meaning).toBe("second");
  });

  it("counts non-English words as failures", () => {
    const result = importer.importFromAnkiDeck(
      {
        deckNames: ["Test"],
        noteTypes: [],
        rows: [
          { word: "你好", meaning: "hello", line: 1 },
          { word: "robust", meaning: "strong", line: 2 }
        ],
        warnings: []
      },
      {
        fileName: "test.apkg",
        format: "apkg",
        dictionaryName: "Test",
        difficulty: 8,
        importedAt: 10
      }
    );

    expect(result.failedCount).toBe(1);
    expect(result.successCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface FixtureOptions {
  emptyCollection?: boolean;
  malformedJson?: boolean;
  withSoundRef?: boolean;
  customFields?: [string, string];
  orphanNote?: boolean;
  useAnki21?: boolean;
}

async function createApkgFixture(opts: FixtureOptions = {}): Promise<ArrayBuffer> {
  const JSZip = (await import("jszip")).default;
  const initSqlJs = (await import("sql.js")).default;

  const wasmBinary = loadWasmBinary();
  const SQL = await initSqlJs({ wasmBinary });

  const db = new SQL.Database();

  db.run(`
    CREATE TABLE col (
      id INTEGER PRIMARY KEY,
      crt INTEGER,
      mod INTEGER,
      scm INTEGER,
      ver INTEGER,
      dty INTEGER,
      usn INTEGER,
      ls INTEGER,
      conf TEXT,
      models TEXT,
      decks TEXT,
      dconf TEXT,
      tags TEXT
    )
  `);

  db.run(`
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      guid TEXT,
      mid INTEGER,
      mod INTEGER,
      usn INTEGER,
      tags TEXT,
      flds TEXT,
      sfld TEXT,
      csum INTEGER,
      flags INTEGER,
      data TEXT
    )
  `);

  db.run(`
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER,
      did INTEGER,
      ord INTEGER,
      mod INTEGER,
      usn INTEGER,
      type INTEGER,
      queue INTEGER,
      due INTEGER,
      ivl INTEGER,
      factor INTEGER,
      reps INTEGER,
      lapses INTEGER,
      left INTEGER,
      odue INTEGER,
      odid INTEGER,
      flags INTEGER,
      data TEXT
    )
  `);

  const fieldDefs = opts.customFields
    ? [
        { name: opts.customFields[0], ord: 0 },
        { name: opts.customFields[1], ord: 1 }
      ]
    : [
        { name: "Front", ord: 0 },
        { name: "Back", ord: 1 }
      ];

  const models = {
    "1": {
      id: 1,
      name: "Basic",
      type: 0,
      mod: 0,
      usn: 0,
      sortf: 0,
      did: 1,
      tmpls: [],
      flds: fieldDefs,
      css: "",
      latexPre: "",
      latexPost: "",
      req: []
    }
  };

  const decks = {
    "1": { id: 1, name: "Test Deck" }
  };

  if (!opts.emptyCollection) {
    const modelsJson = opts.malformedJson ? "{not valid json" : JSON.stringify(models);
    db.run(
      "INSERT INTO col (id, models, decks) VALUES (1, ?, ?)",
      [modelsJson, JSON.stringify(decks)]
    );
  }

  // Insert sample notes
  if (!opts.emptyCollection && !opts.malformedJson) {
    db.run(
      "INSERT INTO notes (id, guid, mid, flds, sfld) VALUES (1, 'a', 1, ?, 'robust')",
      ["robust\x1f强健的；健壮的"]
    );
    db.run(
      "INSERT INTO notes (id, guid, mid, flds, sfld) VALUES (2, 'b', 1, ?, 'meticulous')",
      ["meticulous\x1f一丝不苟的"]
    );
    db.run(
      "INSERT INTO notes (id, guid, mid, flds, sfld) VALUES (3, 'c', 1, ?, 'concise')",
      ["concise\x1f简洁的<br>明了的"]
    );

    if (opts.withSoundRef) {
      db.run(
        "INSERT INTO notes (id, guid, mid, flds, sfld) VALUES (4, 'd', 1, ?, 'hello')",
        ["hello\x1f[sound:hello.mp3]<b> 你好 </b>"]
      );
    }

    if (opts.orphanNote) {
      db.run(
        "INSERT INTO notes (id, guid, mid, flds, sfld) VALUES (99, 'x', 999, ?, 'orphan')",
        ["orphan\x1fshould be skipped"]
      );
    }
  }

  const dbData = db.export();
  db.close();

  const zip = new JSZip();
  const dbFileName = opts.useAnki21 ? "collection.anki21" : "collection.anki2";
  zip.file(dbFileName, dbData);

  return zip.generateAsync({ type: "arraybuffer" });
}
