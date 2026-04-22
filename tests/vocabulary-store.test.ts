import { describe, expect, it, vi } from "vitest";
import { VocabularyStore } from "../src/stores/VocabularyStore";
import type { DictionaryEntry, FavoriteWord } from "../src/types";

function entry(word: string, meaning = "释义"): DictionaryEntry {
  return {
    word,
    normalizedWord: word.toLowerCase(),
    dictionaryName: "Test",
    difficulty: 7,
    meaning,
    source: "built-in"
  };
}

describe("VocabularyStore", () => {
  it("adds, removes, and toggles known words", () => {
    let now = 100;
    const save = vi.fn();
    const change = vi.fn();
    const favorites: Record<string, FavoriteWord> = {};
    const store = new VocabularyStore(favorites, save, change, () => now);

    const favorite = store.add(entry("Robust"), "Robust");

    expect(favorite).toMatchObject({
      word: "Robust",
      normalizedWord: "robust",
      known: false
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledTimes(1);

    now = 200;
    expect(store.toggleKnown("ROBUST")?.known).toBe(true);
    expect(store.get("robust")?.updatedAt).toBe(200);

    store.remove("robust");
    expect(store.get("robust")).toBeUndefined();
  });

  it("does not reset createdAt when adding an existing word", () => {
    let now = 100;
    const store = new VocabularyStore({}, undefined, undefined, () => now);

    store.add(entry("robust", "旧释义"));
    now = 200;
    store.add(entry("robust", "新释义"));

    expect(store.get("robust")).toMatchObject({
      createdAt: 100,
      updatedAt: 200,
      meaning: "新释义"
    });
  });

  it("searches by word and meaning and sorts results", () => {
    let now = 100;
    const store = new VocabularyStore({}, undefined, undefined, () => now);

    store.add(entry("robust", "强健的"));
    now = 200;
    store.add(entry("concise", "简洁的"));

    expect(store.search("强健", "created-desc").map((word) => word.normalizedWord)).toEqual([
      "robust"
    ]);
    expect(store.search("", "created-desc").map((word) => word.normalizedWord)).toEqual([
      "concise",
      "robust"
    ]);
    expect(store.search("", "word-asc").map((word) => word.normalizedWord)).toEqual([
      "concise",
      "robust"
    ]);
    expect(store.search("", "word-desc").map((word) => word.normalizedWord)).toEqual([
      "robust",
      "concise"
    ]);
  });
});
