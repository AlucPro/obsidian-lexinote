import type { FavoriteWord } from "../types";

export type VocabularyExportFormat = "lexinote-json" | "anki-tsv";

interface LexiNoteVocabularyExportRow {
  word: string;
  meaning: string;
  difficulty?: number;
  dictionaryName: "My vocabulary";
}

export class VocabularyExporter {
  exportAsLexiNoteJson(words: FavoriteWord[]): string {
    const rows: LexiNoteVocabularyExportRow[] = words.map((word) => {
      const row: LexiNoteVocabularyExportRow = {
        word: word.word,
        meaning: word.meaning ?? "",
        dictionaryName: "My vocabulary"
      };

      if (Number.isFinite(word.difficulty)) {
        row.difficulty = word.difficulty;
      }

      return row;
    });

    return `${JSON.stringify(rows, null, 2)}\n`;
  }

  exportAsAnkiTsv(words: FavoriteWord[]): string {
    const rows = words.map((word) =>
      [word.word, word.meaning ?? ""].map((field) => this.sanitizeTsvField(field)).join("\t")
    );

    return ["word\tmeaning", ...rows].join("\n");
  }

  createFileName(format: VocabularyExportFormat, date = new Date()): string {
    const dateStamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("");

    if (format === "anki-tsv") {
      return `lexinote-anki-${dateStamp}.tsv`;
    }

    return `lexinote-vocabulary-${dateStamp}.json`;
  }

  private sanitizeTsvField(value: string): string {
    return value.replace(/[\t\r\n]+/g, " ").trim();
  }
}
