import type { TextRange } from "../types";

export interface Token {
  word: string;
  range: TextRange;
}

export class Tokenizer {
  tokenize(text: string, ranges: TextRange[]): Token[] {
    const tokens: Token[] = [];
    const wordPattern = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

    for (const range of ranges) {
      const segment = text.slice(range.from, range.to);
      let match: RegExpExecArray | null;

      wordPattern.lastIndex = 0;
      while ((match = wordPattern.exec(segment)) !== null) {
        tokens.push({
          word: match[0],
          range: {
            from: range.from + match.index,
            to: range.from + match.index + match[0].length
          }
        });
      }
    }

    return tokens;
  }
}
