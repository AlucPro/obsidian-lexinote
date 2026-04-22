import type {
  DictionaryDifficulty,
  DictionaryEntry,
  ImportResult
} from "../types";

export interface ImportOptions {
  fileName: string;
  content: string;
  format: "json" | "csv" | "txt";
  dictionaryName: string;
  difficulty: DictionaryDifficulty;
  importedAt: number;
}

interface ParsedRow {
  word?: unknown;
  meaning?: unknown;
  line?: number;
}

export class DictionaryImporter {
  import(options: ImportOptions): ImportResult {
    const dictionaryName = options.dictionaryName.trim();
    const errors: ImportResult["errors"] = [];

    if (!dictionaryName) {
      return this.emptyResult([
        {
          message: "Dictionary name is required."
        }
      ]);
    }

    if (!Number.isFinite(options.difficulty) || options.difficulty <= 0) {
      return this.emptyResult([
        {
          message: "Dictionary difficulty must be a finite positive number."
        }
      ]);
    }

    const parsedRows = this.parseRows(options, errors);
    if (!parsedRows) {
      return {
        successCount: 0,
        failedCount: errors.length,
        skippedCount: 0,
        errors
      };
    }

    const entriesByWord = new Map<string, DictionaryEntry>();
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const row of parsedRows) {
      const word = this.stringifyImportValue(row.word).trim();

      if (!word) {
        skippedCount += 1;
        continue;
      }

      if (!/[A-Za-z]/.test(word)) {
        failedCount += 1;
        errors.push({
          line: row.line,
          message: `Invalid word: ${word}`
        });
        continue;
      }

      const normalizedWord = word.toLowerCase();
      const meaning =
        typeof row.meaning === "string" && row.meaning.trim()
          ? row.meaning.trim()
          : undefined;

      entriesByWord.set(normalizedWord, {
        word,
        normalizedWord,
        dictionaryName,
        difficulty: options.difficulty,
        meaning,
        source: "custom"
      });
      successCount += 1;
    }

    const entries = Array.from(entriesByWord.values());

    return {
      snapshot: {
        entries,
        importedAt: options.importedAt,
        sourceFileName: options.fileName,
        dictionaryName,
        difficulty: options.difficulty,
        stats: {
          successCount,
          failedCount,
          skippedCount
        }
      },
      successCount,
      failedCount,
      skippedCount,
      errors
    };
  }

  private parseRows(
    options: ImportOptions,
    errors: ImportResult["errors"]
  ): ParsedRow[] | undefined {
    if (options.format === "json") {
      return this.parseJsonRows(options.content, errors);
    }

    if (options.format === "csv") {
      return this.parseCsvRows(options.content);
    }

    return this.parseTxtRows(options.content);
  }

  private parseJsonRows(
    content: string,
    errors: ImportResult["errors"]
  ): ParsedRow[] | undefined {
    try {
      const data: unknown = JSON.parse(content);

      if (!Array.isArray(data)) {
        errors.push({
          message: "JSON dictionary must be an array."
        });
        return undefined;
      }

      return data.map((item, index) => {
        if (typeof item === "string") {
          return {
            word: item,
            line: index + 1
          };
        }

        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          return {
            word: row.word,
            meaning: row.meaning,
            line: index + 1
          };
        }

        return {
          word: undefined,
          line: index + 1
        };
      });
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Failed to parse JSON."
      });
      return undefined;
    }
  }

  private parseCsvRows(content: string): ParsedRow[] {
    const lines = content.split(/\r?\n/);
    const headerLineIndex = lines.findIndex((line) => line.trim().length > 0);
    const firstColumns =
      headerLineIndex >= 0 ? this.parseCsvLine(lines[headerLineIndex]) : [];
    const hasHeader = firstColumns.some((column) =>
      ["word", "meaning"].includes(column.trim().toLowerCase())
    );
    const wordIndex = hasHeader
      ? firstColumns.findIndex((column) => column.trim().toLowerCase() === "word")
      : 0;
    const meaningIndex = hasHeader
      ? firstColumns.findIndex((column) => column.trim().toLowerCase() === "meaning")
      : 1;

    const rows: ParsedRow[] = [];

    lines.forEach((line, index) => {
      if (hasHeader && index === headerLineIndex) {
        return;
      }

      const columns = this.parseCsvLine(line);
      const word = columns[wordIndex >= 0 ? wordIndex : 0];
      const meaning = meaningIndex >= 0 ? columns[meaningIndex] : columns[1];

      rows.push({
        word,
        meaning,
        line: index + 1
      });
    });

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const columns: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        columns.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    columns.push(current.trim());
    return columns;
  }

  private parseTxtRows(content: string): ParsedRow[] {
    return content.split(/\r?\n/).map((line, index) => ({
      word: line,
      line: index + 1
    }));
  }

  private stringifyImportValue(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return "";
  }

  private emptyResult(errors: ImportResult["errors"]): ImportResult {
    return {
      successCount: 0,
      failedCount: errors.length,
      skippedCount: 0,
      errors
    };
  }
}
