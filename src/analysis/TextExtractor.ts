import type { TextRange } from "../types";

export class TextExtractor {
  getExcludedRanges(text: string): TextRange[] {
    const ranges: TextRange[] = [];

    this.addFrontmatterRange(text, ranges);
    this.addRegexRanges(text, /```[\s\S]*?(?:```|$)/g, ranges);
    this.addRegexRanges(text, /`[^`\n]*`/g, ranges);
    this.addRegexRanges(text, /\b(?:https?:\/\/|www\.)\S+/g, ranges);
    this.addRegexRanges(text, /\[\[[\s\S]*?\]\]/g, ranges);

    return this.mergeRanges(ranges, text.length);
  }

  getAnalyzableRanges(text: string): TextRange[] {
    const excludedRanges = this.getExcludedRanges(text);
    const analyzableRanges: TextRange[] = [];
    let cursor = 0;

    for (const range of excludedRanges) {
      if (cursor < range.from) {
        analyzableRanges.push({
          from: cursor,
          to: range.from
        });
      }
      cursor = Math.max(cursor, range.to);
    }

    if (cursor < text.length) {
      analyzableRanges.push({
        from: cursor,
        to: text.length
      });
    }

    return analyzableRanges;
  }

  private addFrontmatterRange(text: string, ranges: TextRange[]): void {
    const match = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);

    if (match) {
      ranges.push({
        from: 0,
        to: match[0].length
      });
    }
  }

  private addRegexRanges(text: string, pattern: RegExp, ranges: TextRange[]): void {
    let match: RegExpExecArray | null;

    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({
        from: match.index,
        to: match.index + match[0].length
      });
    }
  }

  private mergeRanges(ranges: TextRange[], textLength: number): TextRange[] {
    const sortedRanges = ranges
      .map((range) => ({
        from: Math.max(0, Math.min(range.from, textLength)),
        to: Math.max(0, Math.min(range.to, textLength))
      }))
      .filter((range) => range.from < range.to)
      .sort((a, b) => a.from - b.from || a.to - b.to);

    const mergedRanges: TextRange[] = [];

    for (const range of sortedRanges) {
      const previous = mergedRanges[mergedRanges.length - 1];

      if (previous && range.from <= previous.to) {
        previous.to = Math.max(previous.to, range.to);
      } else {
        mergedRanges.push({ ...range });
      }
    }

    return mergedRanges;
  }
}
