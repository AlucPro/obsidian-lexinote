export class Normalizer {
  normalize(word: string): string {
    return word.toLowerCase();
  }

  getLookupCandidates(word: string): string[] {
    const lowercasedWord = this.normalize(word);
    const rawCandidates = [
      lowercasedWord,
      this.removeSuffix(lowercasedWord, "s"),
      this.removeSuffix(lowercasedWord, "es"),
      this.removeSuffix(lowercasedWord, "ed"),
      this.removeSuffix(lowercasedWord, "ing")
    ];
    const candidates: string[] = [];
    const seen = new Set<string>();

    for (const candidate of rawCandidates) {
      if (candidate.length > 1 && !seen.has(candidate)) {
        candidates.push(candidate);
        seen.add(candidate);
      }
    }

    return candidates;
  }

  private removeSuffix(word: string, suffix: string): string {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }

    return word;
  }
}
