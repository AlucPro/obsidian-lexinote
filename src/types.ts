export type DictionaryDifficulty = number;

export type DictionarySource = "built-in" | "custom";

export interface DictionaryEntry {
  word: string;
  normalizedWord: string;
  dictionaryName: string;
  difficulty: DictionaryDifficulty;
  meaning?: string;
  source: DictionarySource;
}

export interface FavoriteWord {
  word: string;
  normalizedWord: string;
  meaning?: string;
  dictionaryName?: string;
  difficulty?: DictionaryDifficulty;
  createdAt: number;
  updatedAt: number;
  known: boolean;
}

export interface ImportStats {
  successCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface ImportError {
  line?: number;
  message: string;
}

export interface ImportResult {
  snapshot?: CustomDictionarySnapshot;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportError[];
}

export interface CustomDictionarySnapshot {
  entries: DictionaryEntry[];
  importedAt: number;
  sourceFileName: string;
  dictionaryName: string;
  difficulty: DictionaryDifficulty;
  stats: ImportStats;
}

export interface LexiNoteSettings {
  userDifficulty: DictionaryDifficulty;
  highlightColor: string;
  dictionarySource: "built-in" | "custom";
  hideKnownWords: boolean;
  fallbackApiEnabled: boolean;
  fallbackApiEndpoint?: string;
  fallbackApiKey?: string;
}

export interface LexiNotePluginData {
  settings: LexiNoteSettings;
  favorites: Record<string, FavoriteWord>;
  customDictionarySnapshot?: CustomDictionarySnapshot;
  metrics?: LocalMetrics;
}

export interface LocalMetrics {
  vocabularyLibraryOpenCount: number;
  favoriteSearchCount: number;
  dailyAddedFavorites: Record<string, number>;
}

export interface TextRange {
  from: number;
  to: number;
}

export interface AnalyzedWordOccurrence {
  word: string;
  normalizedWord: string;
  range: TextRange;
  dictionaryEntry: DictionaryEntry;
}

export interface AnalyzedDifficultWord {
  word: string;
  normalizedWord: string;
  meaning?: string;
  dictionaryName: string;
  difficulty: DictionaryDifficulty;
  firstRange: TextRange;
  occurrences: AnalyzedWordOccurrence[];
  favorite: boolean;
  known: boolean;
}

export interface DocumentAnalysisResult {
  filePath: string;
  updatedAt: number;
  difficultWords: AnalyzedDifficultWord[];
}

export type RefreshReason =
  | "startup"
  | "editor-change"
  | "active-file-change"
  | "settings-change"
  | "dictionary-change"
  | "favorites-change";
