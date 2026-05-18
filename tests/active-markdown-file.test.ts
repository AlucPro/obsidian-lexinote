import { describe, expect, it } from "vitest";
import { ActiveMarkdownFileResolver } from "../src/workspace/ActiveMarkdownFileResolver";

interface TestFile {
  path: string;
  extension: string;
}

describe("ActiveMarkdownFileResolver", () => {
  it("keeps the last markdown file when a sidebar leaf becomes active", () => {
    const resolver = new ActiveMarkdownFileResolver<TestFile>();
    const note = {
      path: "Story.md",
      extension: "md"
    };

    expect(resolver.resolve(note)).toBe(note);
    expect(resolver.resolve(null)).toBe(note);
  });

  it("clears the remembered markdown file when a non-markdown file becomes active", () => {
    const resolver = new ActiveMarkdownFileResolver<TestFile>();

    resolver.resolve({
      path: "Story.md",
      extension: "md"
    });
    expect(
      resolver.resolve({
        path: "Cover.png",
        extension: "png"
      })
    ).toBeUndefined();
    expect(resolver.resolve(null)).toBeUndefined();
  });
});
