import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

describe("Vocabulary library layout styles", () => {
  it("gives the library heading and controls enough breathing room", () => {
    expect(styles).toMatch(/\.lexinote-library\s*{[^}]*padding:\s*16px;/s);
    expect(styles).toMatch(
      /\.lexinote-library-heading\s*{[^}]*margin-bottom:\s*16px;/s
    );
    expect(styles).toMatch(/\.lexinote-library-controls\s*{[^}]*flex-wrap:\s*wrap;/s);
  });

  it("allows the search box and action buttons to wrap on narrow panes", () => {
    expect(styles).toMatch(
      /\.lexinote-library-search\s*{[^}]*flex:\s*1 1 180px;/s
    );
    expect(styles).toMatch(/\.lexinote-library-actions\s*{[^}]*flex-wrap:\s*wrap;/s);
  });
});
