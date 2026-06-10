import type JSZip from "jszip";
import { cleanAnkiHtml } from "./htmlCleaner";
import type { ParsedDictionaryRow } from "./AnkiTextParser";

export interface ParsedAnkiNoteType {
  id: string;
  name: string;
  fields: string[];
  noteCount: number;
  suggestedWordField?: string;
  suggestedMeaningFields: string[];
}

export interface ParsedAnkiDeck {
  deckNames: string[];
  noteTypes: ParsedAnkiNoteType[];
  rows: ParsedDictionaryRow[];
  warnings: string[];
}

export interface AnkiPackageParserOptions {
  binaryContent: ArrayBuffer;
  wasmBinary: ArrayBuffer;
}

interface AnkiModel {
  name: string;
  flds: Array<{ name: string }>;
}

interface AnkiDeckConfig {
  name: string;
}

const WORD_FIELD_CANDIDATES = [
  "word", "term", "front", "expression", "vocab", "vocabulary",
  "english", "英文", "单词", "词汇", "text", "phrase", "spelling",
  "worden", "question", "key", "term-front", "characters"
];

const MEANING_FIELD_CANDIDATES = [
  "meaning", "definition", "back", "translation", "chinese", "zh",
  "中文", "释义", "解释", "翻译", "answer", "description", "reading",
  "sentence", "example", "hint", "mnemonic", "back-text", "sense"
];

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseModelMap(value: unknown): Record<string, AnkiModel> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const models: Record<string, AnkiModel> = {};
  for (const [id, model] of Object.entries(value)) {
    if (!isRecord(model) || typeof model.name !== "string" || !Array.isArray(model.flds)) {
      return undefined;
    }

    const fields = model.flds;
    if (!fields.every((field) => isRecord(field) && typeof field.name === "string")) {
      return undefined;
    }

    models[id] = {
      name: model.name,
      flds: fields.map((field) => ({ name: (field as { name: string }).name }))
    };
  }

  return models;
}

function parseDeckMap(value: unknown): Record<string, AnkiDeckConfig> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const decks: Record<string, AnkiDeckConfig> = {};
  for (const [id, deck] of Object.entries(value)) {
    if (!isRecord(deck) || typeof deck.name !== "string") {
      return undefined;
    }

    decks[id] = { name: deck.name };
  }

  return decks;
}

function findSuggestedFields(fields: string[]): {
  suggestedWordField?: string;
  suggestedMeaningFields: string[];
} {
  const normalized = fields.map((f) => normalizeFieldName(f));

  let suggestedWordField: string | undefined;
  let suggestedMeaningFields: string[] = [];

  for (const candidate of WORD_FIELD_CANDIDATES) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) {
      suggestedWordField = fields[idx];
      break;
    }
  }

  if (!suggestedWordField && fields.length >= 1) {
    suggestedWordField = fields[0];
  }

  for (const candidate of MEANING_FIELD_CANDIDATES) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0 && fields[idx] !== suggestedWordField) {
      if (!suggestedMeaningFields.includes(fields[idx])) {
        suggestedMeaningFields.push(fields[idx]);
      }
    }
  }

  if (suggestedMeaningFields.length === 0 && fields.length >= 2) {
    const secondField = fields[1];
    if (secondField !== suggestedWordField) {
      suggestedMeaningFields.push(secondField);
    }
  }

  return { suggestedWordField, suggestedMeaningFields };
}

function convertFromAnkiNote(
  fields: string[],
  fieldNames: string[],
  wordFieldIndex: number,
  meaningFieldIndices: number[],
  noteIndex: number
): ParsedDictionaryRow {
  const rawWord = wordFieldIndex < fields.length ? fields[wordFieldIndex] : "";
  const word = cleanAnkiHtml(rawWord);

  const meaningParts = meaningFieldIndices
    .filter((idx) => idx < fields.length)
    .map((idx) => cleanAnkiHtml(fields[idx]))
    .filter((m) => m.length > 0);

  const meaning = meaningParts.length > 0 ? meaningParts.join(" / ") : undefined;

  return {
    word,
    meaning,
    line: noteIndex + 1,
    sourceMeta: {
      fieldCount: fields.length,
      fieldNames: fieldNames.join(", "),
      noteIndex
    }
  };
}

async function resolveDatabase(
  zip: JSZip,
  warnings: string[]
): Promise<{ file: string; data: Uint8Array } | undefined> {
  const candidates = ["collection.anki21b", "collection.anki21", "collection.anki2"];

  for (const candidate of candidates) {
    const file = zip.file(candidate);
    if (file) {
      const data = await file.async("uint8array");
      return { file: candidate, data };
    }
  }

  warnings.push(
    "No collection database found. Expected one of: collection.anki21b, collection.anki21, collection.anki2."
  );
  return undefined;
}

export async function parseAnkiPackage(
  options: AnkiPackageParserOptions
): Promise<ParsedAnkiDeck> {
  const warnings: string[] = [];
  const { binaryContent, wasmBinary } = options;

  // Load dependencies
  const [JSZipModule, initSqlJs] = await Promise.all([
    import("jszip"),
    import("sql.js")
  ]);

  // Initialize JSZip
  const JSZipClass = JSZipModule.default;
  const zip = new JSZipClass();
  try {
    await zip.loadAsync(binaryContent);
  } catch {
    warnings.push(
      "Failed to open package: the file is not a valid zip archive. Ensure the file is an Anki Deck Package (.apkg)."
    );
    return { deckNames: [], noteTypes: [], rows: [], warnings };
  }

  // Find collection database
  const dbResult = await resolveDatabase(zip, warnings);
  if (!dbResult) {
    return { deckNames: [], noteTypes: [], rows: [], warnings };
  }

  // Initialize SQL.js with provided WASM binary
  const SQL = await initSqlJs.default({ wasmBinary });
  const db = new SQL.Database(dbResult.data);

  try {
    // Read collection config for models/note types
    const colRows = db.exec("SELECT models, decks FROM col");
    if (colRows.length === 0 || colRows[0].values.length === 0) {
      warnings.push("Collection table is empty.");
      return { deckNames: [], noteTypes: [], rows: [], warnings };
    }

    const modelsJson = colRows[0].values[0][0] as string;
    const decksJson = colRows[0].values[0][1] as string;

    let models: Record<string, AnkiModel>;
    let decks: Record<string, AnkiDeckConfig>;

    try {
      const parsedModels = JSON.parse(modelsJson) as unknown;
      const parsedDecks = JSON.parse(decksJson) as unknown;
      const modelMap = parseModelMap(parsedModels);
      const deckMap = parseDeckMap(parsedDecks);
      if (!modelMap || !deckMap) {
        warnings.push("Collection models or decks JSON has an unsupported shape.");
        return { deckNames: [], noteTypes: [], rows: [], warnings };
      }
      models = modelMap;
      decks = deckMap;
    } catch {
      warnings.push("Failed to parse collection models or decks JSON.");
      return { deckNames: [], noteTypes: [], rows: [], warnings };
    }

    const deckNames = Object.values(decks).map((d) => d.name);

    // Build note type info
    const modelIds = Object.keys(models);
    const noteTypes: ParsedAnkiNoteType[] = [];

    for (const mid of modelIds) {
      const model = models[mid];
      const fieldNames = model.flds.map((f) => f.name);

      // Count notes for this model
      const countResult = db.exec(
        `SELECT COUNT(*) FROM notes WHERE mid = ${Number(mid)}`
      );
      const noteCount =
        countResult.length > 0 && countResult[0].values.length > 0
          ? (countResult[0].values[0][0] as number)
          : 0;

      const { suggestedWordField, suggestedMeaningFields } =
        findSuggestedFields(fieldNames);

      noteTypes.push({
        id: mid,
        name: model.name,
        fields: fieldNames,
        noteCount,
        suggestedWordField,
        suggestedMeaningFields
      });
    }

    // Read notes and convert to rows
    const notesResult = db.exec("SELECT id, mid, flds FROM notes");
    const rows: ParsedDictionaryRow[] = [];

    if (notesResult.length > 0) {
      const notesData = notesResult[0].values;
      const modelCache = new Map<number, { fields: string[]; wordIdx: number; meaningIdxs: number[] }>();

      for (let i = 0; i < notesData.length; i += 1) {
        const [, mid, flds] = notesData[i] as [number, number, string];
        const fields = flds.split("\x1f");

        let cache = modelCache.get(mid);
        if (!cache) {
          const model = models[String(mid)];
          if (!model) {
            warnings.push(`Unknown model id ${mid} for note at index ${i}.`);
            continue;
          }

          const fieldNames = model.flds.map((f) => f.name);
          const { suggestedWordField, suggestedMeaningFields } =
            findSuggestedFields(fieldNames);

          const wordIdx = suggestedWordField
            ? fieldNames.indexOf(suggestedWordField)
            : 0;

          const meaningIdxs = suggestedMeaningFields
            .map((name) => fieldNames.indexOf(name))
            .filter((idx) => idx >= 0);

          cache = { fields: fieldNames, wordIdx, meaningIdxs };
          modelCache.set(mid, cache);
        }

        rows.push(
          convertFromAnkiNote(fields, cache.fields, cache.wordIdx, cache.meaningIdxs, i)
        );
      }
    }

    return { deckNames, noteTypes, rows, warnings };
  } finally {
    db.close();
  }
}
