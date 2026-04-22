import { afterEach, describe, expect, it, vi } from "vitest";
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
    vi.unstubAllGlobals();
  });

  it("does not request when fallback is disabled", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const result = await new FallbackDefinitionClient().lookup("robust", {
      ...settings,
      fallbackApiEnabled: false
    });

    expect(result.error).toBe("fallback disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error when endpoint is missing", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const result = await new FallbackDefinitionClient().lookup("robust", {
      ...settings,
      fallbackApiEndpoint: ""
    });

    expect(result.error).toBe("fallback endpoint is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts only the word and parses a meaning response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ meaning: "强健的" }), {
        status: 200
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await new FallbackDefinitionClient().lookup("robust", {
      ...settings,
      fallbackApiKey: "secret"
    });

    expect(result.meaning).toBe("强健的");
    expect(fetchMock).toHaveBeenCalledWith(settings.fallbackApiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret"
      },
      body: JSON.stringify({
        word: "robust"
      })
    });
  });

  it("returns an error on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await new FallbackDefinitionClient().lookup("robust", settings);

    expect(result.error).toBe("network down");
  });
});
