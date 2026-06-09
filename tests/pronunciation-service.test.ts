import { describe, expect, it } from "vitest";
import { PronunciationService } from "../src/pronunciation/PronunciationService";

class FakeUtterance {
  lang = "";
  voice?: SpeechSynthesisVoice | null;

  constructor(public readonly text: string) {}
}

function voice(
  name: string,
  lang: string,
  options: Partial<SpeechSynthesisVoice> = {}
): SpeechSynthesisVoice {
  return {
    name,
    lang,
    voiceURI: name,
    localService: true,
    default: false,
    ...options
  } as SpeechSynthesisVoice;
}

function createRuntime(now = 1000, voices: SpeechSynthesisVoice[] = []) {
  const spoken: FakeUtterance[] = [];
  let currentNow = now;
  const runtime = {
    SpeechSynthesisUtterance: FakeUtterance,
    now: () => currentNow,
    speechSynthesis: {
      cancelCalls: 0,
      speak(utterance: FakeUtterance) {
        spoken.push(utterance);
      },
      cancel() {
        this.cancelCalls += 1;
      },
      getVoices() {
        return voices;
      }
    }
  };

  return {
    runtime,
    spoken,
    setNow(nextNow: number) {
      currentNow = nextNow;
    }
  };
}

describe("PronunciationService", () => {
  it("does not speak when speech synthesis is unavailable", () => {
    const service = new PronunciationService({});

    expect(service.speakWord("robust")).toBe(false);
  });

  it("ignores empty and non-English input", () => {
    const { runtime, spoken } = createRuntime();
    const service = new PronunciationService(runtime);

    expect(service.speakWord("   ")).toBe(false);
    expect(service.speakWord("中文")).toBe(false);
    expect(spoken).toHaveLength(0);
  });

  it("speaks an English word with the system speech synthesis runtime", () => {
    const { runtime, spoken } = createRuntime();
    const service = new PronunciationService(runtime);

    expect(service.speakWord(" robust ")).toBe(true);

    expect(runtime.speechSynthesis.cancelCalls).toBe(1);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe("robust");
    expect(spoken[0].lang).toBe("en-US");
  });

  it("prefers a natural English default voice instead of the first English voice", () => {
    const badNews = voice("Bad News", "en-US");
    const alex = voice("Alex", "en-US", { default: true });
    const { runtime, spoken } = createRuntime(1000, [badNews, alex]);
    const service = new PronunciationService(runtime);

    expect(service.speakWord("robust")).toBe(true);

    expect(spoken[0].voice).toBe(alex);
  });

  it("throttles rapid repeated speak requests", () => {
    const { runtime, spoken, setNow } = createRuntime();
    const service = new PronunciationService(runtime);

    expect(service.speakWord("robust")).toBe(true);
    setNow(1100);
    expect(service.speakWord("resilient")).toBe(false);
    setNow(1300);
    expect(service.speakWord("resilient")).toBe(true);

    expect(spoken.map((utterance) => utterance.text)).toEqual([
      "robust",
      "resilient"
    ]);
  });

  it("cancels queued speech safely", () => {
    const { runtime } = createRuntime();
    const service = new PronunciationService(runtime);

    service.cancel();

    expect(runtime.speechSynthesis.cancelCalls).toBe(1);
  });
});
