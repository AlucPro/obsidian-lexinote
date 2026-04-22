import type { DictionaryDifficulty, LexiNoteSettings } from "./types";

export const DEFAULT_USER_DIFFICULTY: DictionaryDifficulty = 4;

export const DEFAULT_SETTINGS: LexiNoteSettings = {
  userDifficulty: DEFAULT_USER_DIFFICULTY,
  highlightColor: "#fff3a3",
  dictionarySource: "built-in-only",
  hideKnownWords: true,
  fallbackApiEnabled: false,
  fallbackApiEndpoint: "",
  fallbackApiKey: ""
};

export const NO_LOCAL_MEANING_TEXT = "暂无本地释义";

export const SIDEBAR_VIEW_TYPE = "lexinote-current-document";

export const LIBRARY_VIEW_TYPE = "lexinote-vocabulary-library";
