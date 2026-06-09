import { describe, expect, it } from "vitest";
import {
  isDictionaryEnabledForPath,
  normalizeDictionaryRulePath
} from "../src/workspace/DictionaryPathRuleMatcher";
import type { DictionaryPathRule } from "../src/types";

function rule(
  mode: DictionaryPathRule["mode"],
  path: string,
  id = `${mode}:${path}`
): DictionaryPathRule {
  return { id, mode, path };
}

describe("normalizeDictionaryRulePath", () => {
  it("normalizes vault-relative paths", () => {
    expect(normalizeDictionaryRulePath(" /English\\\\Reading// ")).toBe(
      "English/Reading"
    );
    expect(normalizeDictionaryRulePath("English/reading.md")).toBe(
      "English/reading.md"
    );
  });

  it("rejects empty and parent-traversal paths", () => {
    expect(normalizeDictionaryRulePath(" / ")).toBe("");
    expect(normalizeDictionaryRulePath("English/../Private")).toBe("");
    expect(normalizeDictionaryRulePath("English/./Private")).toBe("");
  });
});

describe("isDictionaryEnabledForPath", () => {
  it("enables all files when rules are empty or invalid", () => {
    expect(isDictionaryEnabledForPath("Any/file.md", [])).toBe(true);
    expect(
      isDictionaryEnabledForPath("Any/file.md", [
        rule("enabled", ""),
        { id: "bad-mode", mode: "invalid" as DictionaryPathRule["mode"], path: "Any" }
      ])
    ).toBe(true);
  });

  it("uses disabled rules as an opt-out list when there are no enabled rules", () => {
    const rules = [rule("disabled", "Archive")];

    expect(isDictionaryEnabledForPath("Archive/old.md", rules)).toBe(false);
    expect(isDictionaryEnabledForPath("English/new.md", rules)).toBe(true);
  });

  it("uses enabled rules as an allow-list when any enabled rule exists", () => {
    const rules = [rule("enabled", "English")];

    expect(isDictionaryEnabledForPath("English/new.md", rules)).toBe(true);
    expect(isDictionaryEnabledForPath("Journal/today.md", rules)).toBe(false);
  });

  it("supports exact file path rules", () => {
    const rules = [
      rule("enabled", "English"),
      rule("disabled", "English/private.md")
    ];

    expect(isDictionaryEnabledForPath("English/private.md", rules)).toBe(false);
    expect(isDictionaryEnabledForPath("English/public.md", rules)).toBe(true);
    expect(isDictionaryEnabledForPath("English/private-copy.md", rules)).toBe(true);
  });

  it("prefers the most specific matching rule", () => {
    expect(
      isDictionaryEnabledForPath("English/Active/note.md", [
        rule("disabled", "English"),
        rule("enabled", "English/Active")
      ])
    ).toBe(true);

    expect(
      isDictionaryEnabledForPath("English/Done/note.md", [
        rule("enabled", "English"),
        rule("disabled", "English/Done")
      ])
    ).toBe(false);
  });

  it("prefers disabled rules at the same path specificity", () => {
    expect(
      isDictionaryEnabledForPath("English/note.md", [
        rule("enabled", "English", "enabled"),
        rule("disabled", "English", "disabled")
      ])
    ).toBe(false);
  });

  it("does not match sibling paths with the same prefix", () => {
    const rules = [rule("disabled", "English")];

    expect(isDictionaryEnabledForPath("English.md", rules)).toBe(true);
    expect(isDictionaryEnabledForPath("EnglishNotes/a.md", rules)).toBe(true);
  });
});
