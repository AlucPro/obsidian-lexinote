import type { DictionaryDifficulty, LexiNoteSettings } from "./types";

export const DEFAULT_USER_DIFFICULTY: DictionaryDifficulty = 3;

export const BUILT_IN_DICTIONARY_IDS = ["built-in:CET4", "built-in:CET6"];

export const DEFAULT_SETTINGS: LexiNoteSettings = {
  userDifficulty: DEFAULT_USER_DIFFICULTY,
  highlightColor: "#fff3a3",
  highlightStyle: "background",
  underlineStyle: "solid",
  enabledDictionaryIds: [...BUILT_IN_DICTIONARY_IDS],
  dictionaryOrder: [...BUILT_IN_DICTIONARY_IDS],
  hideKnownWords: true,
  fallbackApiEnabled: false,
  fallbackApiEndpoint: "",
  fallbackApiKey: "",
};

export const NO_LOCAL_MEANING_TEXT = "暂无本地释义";

export const SIDEBAR_VIEW_TYPE = "lexinote-current-document";

export const LIBRARY_VIEW_TYPE = "lexinote-vocabulary-library";
