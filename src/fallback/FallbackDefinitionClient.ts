import { requestUrl } from "obsidian";
import type { LexiNoteSettings } from "../types";

export interface FallbackLookupResult {
  meaning?: string;
  error?: string;
}

export class FallbackDefinitionClient {
  async lookup(
    word: string,
    settings: LexiNoteSettings
  ): Promise<FallbackLookupResult> {
    if (!settings.fallbackApiEnabled) {
      return {
        error: "fallback disabled"
      };
    }

    if (!settings.fallbackApiEndpoint?.trim()) {
      return {
        error: "fallback endpoint is not configured"
      };
    }

    try {
      const response = await requestUrl({
        url: settings.fallbackApiEndpoint,
        method: "POST",
        contentType: "application/json",
        headers: this.buildHeaders(settings),
        body: JSON.stringify({
          word
        }),
        throw: false
      });

      if (response.status < 200 || response.status >= 300) {
        return {
          error: `fallback request failed: ${response.status}`
        };
      }

      return this.parseResponse(response.text);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "fallback request failed"
      };
    }
  }

  private buildHeaders(settings: LexiNoteSettings): Record<string, string> {
    const headers: Record<string, string> = {};

    if (settings.fallbackApiKey?.trim()) {
      headers.Authorization = `Bearer ${settings.fallbackApiKey.trim()}`;
    }

    return headers;
  }

  private parseResponse(text: string): FallbackLookupResult {
    try {
      const parsed: unknown = JSON.parse(text);

      if (typeof parsed === "string" && parsed.trim()) {
        return {
          meaning: parsed.trim()
        };
      }

      if (parsed && typeof parsed === "object") {
        const response = parsed as Record<string, unknown>;
        const meaning = response.meaning ?? response.definition ?? response.translation;

        if (typeof meaning === "string" && meaning.trim()) {
          return {
            meaning: meaning.trim()
          };
        }
      }

      return {
        error: "fallback response does not include a meaning"
      };
    } catch {
      if (text.trim()) {
        return {
          meaning: text.trim()
        };
      }

      return {
        error: "fallback response is empty"
      };
    }
  }
}
