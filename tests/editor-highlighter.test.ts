import { describe, expect, it } from "vitest";
import { buildHighlightAttributes } from "../src/editor/EditorHighlighter";
import type { LexiNoteSettings } from "../src/types";

const baseSettings: LexiNoteSettings = {
  userDifficulty: 4,
  highlightColor: "#ffd166",
  highlightStyle: "background",
  underlineStyle: "solid",
  enabledDictionaryIds: ["built-in:CET4", "built-in:CET6"],
  dictionaryOrder: ["built-in:CET4", "built-in:CET6"],
  hideKnownWords: true,
  hoverAutoPronunciationEnabled: false,
  dictionaryPathRules: [],
  fallbackApiEnabled: false,
  fallbackApiEndpoint: "",
  fallbackApiKey: ""
};

describe("buildHighlightAttributes", () => {
  it("uses background highlighting by default", () => {
    expect(buildHighlightAttributes(baseSettings)).toEqual({
      class: "lexinote-highlight lexinote-highlight-background",
      style: "--lexinote-highlight-color: #ffd166;"
    });
  });

  it("adds underline style classes for straight and wavy underlines", () => {
    expect(
      buildHighlightAttributes({
        ...baseSettings,
        highlightStyle: "underline",
        underlineStyle: "solid"
      }).class
    ).toBe(
      "lexinote-highlight lexinote-highlight-underline lexinote-highlight-underline-solid"
    );

    expect(
      buildHighlightAttributes({
        ...baseSettings,
        highlightStyle: "underline",
        underlineStyle: "wavy"
      }).class
    ).toBe(
      "lexinote-highlight lexinote-highlight-underline lexinote-highlight-underline-wavy"
    );
  });
});
