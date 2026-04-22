import type { DictionaryDifficulty, LexiNoteSettings } from "./types";

export const DEFAULT_USER_DIFFICULTY: DictionaryDifficulty = 4;

export const DEFAULT_SETTINGS: LexiNoteSettings = {
  userDifficulty: DEFAULT_USER_DIFFICULTY,
  highlightColor: "#fff3a3",
  dictionarySource: "built-in",
  hideKnownWords: true,
  fallbackApiEnabled: false,
  fallbackApiEndpoint: "",
  fallbackApiKey: ""
};

export const BUILT_IN_DICTIONARIES = [
  {
    dictionaryName: "CET4",
    difficulty: 4,
    resourcePath: "resources/dictionaries/cet4.json"
  },
  {
    dictionaryName: "CET6",
    difficulty: 6,
    resourcePath: "resources/dictionaries/cet6.json"
  }
] as const;

export const NO_LOCAL_MEANING_TEXT = "暂无本地释义";

export const SIDEBAR_VIEW_TYPE = "lexinote-current-document";
