import { afterEach, describe, expect, it, vi } from "vitest";
import { requestUrl } from "./mocks/obsidian";
import { FallbackDefinitionClient } from "../src/fallback/FallbackDefinitionClient";
import type { LexiNoteSettings } from "../src/types";

const settings: LexiNoteSettings = {
  userDifficulty: 4,
  highlightColor: "#ffd166",
  dictionarySource: "built-in-only",
  hideKnownWords: true,
  fallbackApiEnabled: true,
  fallbackApiEndpoint: "http://127.0.0.1:8787/lookup",
  fallbackApiKey: ""
};

describe("FallbackDefinitionClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not request when fallback is disabled", async () => {
    const result = await new FallbackDefinitionClient().lookup("robust", {
      ...settings,
      fallbackApiEnabled: false
    });

    expect(result.error).toBe("Fallback disabled.");
    expect(requestUrl).not.toHaveBeenCalled();
  });

  it("returns an error when endpoint is missing", async () => {
    const result = await new FallbackDefinitionClient().lookup("robust", {
      ...settings,
      fallbackApiEndpoint: ""
    });

    expect(result.error).toBe("Fallback endpoint is not configured.");
    expect(requestUrl).not.toHaveBeenCalled();
  });

  it("posts only the word and parses a meaning response", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: { meaning: "强健的" },
      text: JSON.stringify({ meaning: "强健的" })
    });

    const result = await new FallbackDefinitionClient().lookup("robust", {
      ...settings,
      fallbackApiKey: "secret"
    });

    expect(result.meaning).toBe("强健的");
    expect(requestUrl).toHaveBeenCalledWith({
      url: settings.fallbackApiEndpoint,
      method: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer secret"
      },
      body: JSON.stringify({
        word: "robust"
      }),
      throw: false
    });
  });

  it("returns an error on network failure", async () => {
    vi.mocked(requestUrl).mockRejectedValue(new Error("network down"));

    const result = await new FallbackDefinitionClient().lookup("robust", settings);

    expect(result.error).toBe("network down");
  });
});
