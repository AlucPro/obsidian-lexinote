import type { DictionaryEntry, FavoriteWord, LexiNoteSettings } from "../types";

export class DifficultyEvaluator {
  isDifficult(
    entry: DictionaryEntry,
    settings: LexiNoteSettings,
    favorite?: FavoriteWord
  ): boolean {
    if (favorite?.known && settings.hideKnownWords) {
      return false;
    }

    if (!Number.isFinite(entry.difficulty) || entry.difficulty <= 0) {
      return false;
    }

    return entry.difficulty > settings.userDifficulty;
  }
}
