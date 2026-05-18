import { describe, expect, it } from "vitest";
import {
  getLexiNoteLocale,
  translateMessage
} from "../src/i18n";

describe("i18n", () => {
  it("uses Chinese for zh language codes", () => {
    expect(getLexiNoteLocale("zh-CN")).toBe("zh");
    expect(getLexiNoteLocale("zh-TW")).toBe("zh");
    expect(translateMessage("settingsUserDifficulty", "zh-CN")).toBe("用户水平");
  });

  it("uses English for English and unknown language codes", () => {
    expect(getLexiNoteLocale("en")).toBe("en");
    expect(getLexiNoteLocale("fr")).toBe("en");
    expect(translateMessage("settingsUserDifficulty", "fr")).toBe(
      "User difficulty"
    );
  });

  it("falls back without returning undefined for missing keys", () => {
    expect(translateMessage("missing.translation.key", "zh-CN")).toBe(
      "missing.translation.key"
    );
  });

  it("formats placeholder values", () => {
    expect(translateMessage("noticeLexiNoteFound", "en", { count: 3 })).toBe(
      "LexiNote found 3 difficult words."
    );
    expect(translateMessage("noticeLexiNoteFound", "zh-CN", { count: 3 })).toBe(
      "LexiNote 找到 3 个难词。"
    );
  });
});
