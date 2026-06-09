import { cleanAnkiHtml } from "./htmlCleaner";

export interface ParsedDictionaryRow {
  word?: unknown;
  meaning?: unknown;
  line?: number;
  sourceMeta?: Record<string, string | number>;
}

export function parseAnkiText(content: string): ParsedDictionaryRow[] {
  const rows: ParsedDictionaryRow[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) {
      rows.push({ word: "", line: index + 1 });
      continue;
    }

    if (!line.includes("\t")) {
      rows.push({ word: cleanAnkiHtml(line), line: index + 1 });
      continue;
    }

    const columns = line.split("\t");
    const word = cleanAnkiHtml(columns[0]);
    const meaning = columns
      .slice(1)
      .filter((col) => col.trim().length > 0)
      .map((col) => cleanAnkiHtml(col))
      .join(" / ");

    rows.push({ word, meaning, line: index + 1 });
  }

  return rows;
}
