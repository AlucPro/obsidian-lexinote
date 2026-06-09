interface PronunciationUtterance {
  lang: string;
  voice?: SpeechSynthesisVoice | null;
}

type SpeechSynthesisUtteranceCtor = new (text: string) => PronunciationUtterance;

interface SpeechSynthesisLike {
  cancel(): void;
  speak(utterance: PronunciationUtterance): void;
  getVoices(): SpeechSynthesisVoice[];
}

export interface PronunciationRuntime {
  speechSynthesis?: SpeechSynthesisLike;
  SpeechSynthesisUtterance?: SpeechSynthesisUtteranceCtor;
  now?: () => number;
}

export class PronunciationService {
  private readonly minSpeakIntervalMs = 250;
  private lastSpeakAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly runtime: PronunciationRuntime = getDefaultRuntime()) {}

  speakWord(word: string): boolean {
    const text = word.trim();

    if (!text || !/[A-Za-z]/.test(text)) {
      return false;
    }

    const speechSynthesis = this.runtime.speechSynthesis;
    const Utterance = this.runtime.SpeechSynthesisUtterance;

    if (!speechSynthesis || !Utterance) {
      return false;
    }

    const now = this.runtime.now?.() ?? Date.now();

    if (now - this.lastSpeakAt < this.minSpeakIntervalMs) {
      return false;
    }

    try {
      const utterance = new Utterance(text);
      utterance.lang = "en-US";
      utterance.voice = this.findEnglishVoice(speechSynthesis) ?? null;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
      this.lastSpeakAt = now;
      return true;
    } catch {
      return false;
    }
  }

  cancel(): void {
    try {
      this.runtime.speechSynthesis?.cancel();
    } catch {
      // Speech playback should never break plugin teardown or UI interactions.
    }
  }

  private findEnglishVoice(
    speechSynthesis: PronunciationRuntime["speechSynthesis"]
  ): SpeechSynthesisVoice | undefined {
    const voices =
      speechSynthesis
        ?.getVoices()
        .filter((voice) => voice.lang.toLowerCase().startsWith("en")) ?? [];

    const rankedVoices = voices
      .map((voice) => ({
        voice,
        score: scoreEnglishVoice(voice)
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);

    return rankedVoices[0]?.voice;
  }
}

const preferredVoiceNames = [
  "alex",
  "samantha",
  "ava",
  "allison",
  "victoria",
  "daniel",
  "karen",
  "moira",
  "tessa",
  "serena",
  "aria",
  "jenny",
  "guy",
  "david",
  "zira",
  "mark",
  "google us english"
];

const noveltyVoiceNames = [
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "deranged",
  "fred",
  "good news",
  "hysterical",
  "junior",
  "kathy",
  "organ",
  "princess",
  "ralph",
  "trinoids",
  "vicki",
  "whisper",
  "zarvox"
];

function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const normalizedName = voice.name.toLowerCase();
  const normalizedLang = voice.lang.toLowerCase();
  let score = 0;

  if (noveltyVoiceNames.some((name) => normalizedName.includes(name))) {
    score -= 100;
  }

  if (preferredVoiceNames.some((name) => normalizedName.includes(name))) {
    score += 50;
  }

  if (voice.default) {
    score += 30;
  }

  if (normalizedLang === "en-us") {
    score += 20;
  } else if (normalizedLang.startsWith("en-")) {
    score += 10;
  }

  if (voice.localService) {
    score += 5;
  }

  return score;
}

function getDefaultRuntime(): PronunciationRuntime {
  return {
    speechSynthesis: activeWindow.speechSynthesis,
    SpeechSynthesisUtterance:
      typeof SpeechSynthesisUtterance === "undefined"
        ? undefined
        : SpeechSynthesisUtterance
  };
}
