import { describe, expect, it } from "vitest";
import { formatMeaningText } from "../src/ui/meaningText";

describe("formatMeaningText", () => {
  it("uses fallback for empty meanings", () => {
    expect(formatMeaningText("  ", "暂无本地释义")).toBe("暂无本地释义");
    expect(formatMeaningText(undefined, "暂无本地释义")).toBe("暂无本地释义");
  });

  it("turns escaped line breaks into real line breaks", () => {
    expect(formatMeaningText("adj. 好的\\nn. 善", "fallback")).toBe(
      "adj. 好的\nn. 善"
    );
  });

  it("normalizes real CRLF line breaks", () => {
    expect(formatMeaningText("adj. 好的\r\nn. 善", "fallback")).toBe(
      "adj. 好的\nn. 善"
    );
  });
});
