import { DictionaryService } from "../dictionary/DictionaryService";
import type {
  AnalyzedDifficultWord,
  AnalyzedWordOccurrence,
  DocumentAnalysisResult,
  FavoriteWord,
  LexiNoteSettings
} from "../types";
import { DifficultyEvaluator } from "./DifficultyEvaluator";
import { Normalizer } from "./Normalizer";
import { TextExtractor } from "./TextExtractor";
import { Tokenizer } from "./Tokenizer";

export interface AnalyzeInput {
  filePath: string;
  text: string;
  settings: LexiNoteSettings;
  dictionary: DictionaryService;
  favorites: Record<string, FavoriteWord>;
}

export class Analyzer {
  constructor(
    private readonly textExtractor = new TextExtractor(),
    private readonly tokenizer = new Tokenizer(),
    private readonly normalizer = new Normalizer(),
    private readonly difficultyEvaluator = new DifficultyEvaluator()
  ) {}

  analyze(input: AnalyzeInput): DocumentAnalysisResult {
    const analyzableRanges = this.textExtractor.getAnalyzableRanges(input.text);
    const tokens = this.tokenizer.tokenize(input.text, analyzableRanges);
    const difficultWordsByNormalizedWord = new Map<string, AnalyzedDifficultWord>();

    for (const token of tokens) {
      const dictionaryEntry = this.findDictionaryEntry(token.word, input.dictionary);

      if (!dictionaryEntry) {
        continue;
      }

      const favorite = input.favorites[dictionaryEntry.normalizedWord];

      if (!this.difficultyEvaluator.isDifficult(dictionaryEntry, input.settings, favorite)) {
        continue;
      }

      const occurrence: AnalyzedWordOccurrence = {
        word: token.word,
        normalizedWord: dictionaryEntry.normalizedWord,
        range: token.range,
        dictionaryEntry
      };
      const existingWord = difficultWordsByNormalizedWord.get(
        dictionaryEntry.normalizedWord
      );

      if (existingWord) {
        existingWord.occurrences.push(occurrence);
      } else {
        difficultWordsByNormalizedWord.set(dictionaryEntry.normalizedWord, {
          word: token.word,
          normalizedWord: dictionaryEntry.normalizedWord,
          meaning: dictionaryEntry.meaning,
          dictionaryName: dictionaryEntry.dictionaryName,
          difficulty: dictionaryEntry.difficulty,
          firstRange: token.range,
          occurrences: [occurrence],
          favorite: Boolean(favorite),
          known: Boolean(favorite?.known)
        });
      }
    }

    return {
      filePath: input.filePath,
      updatedAt: Date.now(),
      difficultWords: Array.from(difficultWordsByNormalizedWord.values()).sort(
        (a, b) => a.firstRange.from - b.firstRange.from
      )
    };
  }

  private findDictionaryEntry(word: string, dictionary: DictionaryService) {
    for (const candidate of this.normalizer.getLookupCandidates(word)) {
      const entry = dictionary.lookup(candidate);

      if (entry) {
        return entry;
      }
    }

    return undefined;
  }
}
