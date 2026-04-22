import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { NO_LOCAL_MEANING_TEXT } from "../constants";
import type {
  AnalyzedDifficultWord,
  AnalyzedWordOccurrence,
  DocumentAnalysisResult
} from "../types";
import type LexiNotePlugin from "../main";

interface HoverMatch {
  difficultWord: AnalyzedDifficultWord;
  occurrence: AnalyzedWordOccurrence;
}

export class HoverProvider {
  private cardEl?: HTMLElement;
  private currentKey?: string;

  constructor(private readonly plugin: LexiNotePlugin) {}

  buildExtension(): Extension {
    return EditorView.domEventHandlers({
      mousemove: (event, view) => {
        this.handleMouseMove(event, view);
      },
      mouseleave: () => {
        this.hideCard();
      }
    });
  }

  private handleMouseMove(event: MouseEvent, view: EditorView): void {
    const target = event.target;

    if (
      !(target instanceof HTMLElement) ||
      !target.closest(".lexinote-highlight")
    ) {
      this.hideCard();
      return;
    }

    const pos = view.posAtCoords({
      x: event.clientX,
      y: event.clientY
    });

    if (pos === null) {
      this.hideCard();
      return;
    }

    const result = this.plugin.analysisStore.getCurrent();

    if (!result) {
      this.hideCard();
      return;
    }

    const match = this.findHoverMatch(result, pos);

    if (!match) {
      this.hideCard();
      return;
    }

    const nextKey = `${match.occurrence.normalizedWord}:${match.occurrence.range.from}:${match.occurrence.range.to}`;

    if (this.currentKey === nextKey && this.cardEl) {
      this.positionCard(event);
      return;
    }

    this.currentKey = nextKey;
    this.showCard(event, view, result, match);
  }

  private findHoverMatch(
    result: DocumentAnalysisResult,
    pos: number
  ): HoverMatch | undefined {
    for (const difficultWord of result.difficultWords) {
      const occurrence = difficultWord.occurrences.find(
        (item) => pos >= item.range.from && pos < item.range.to
      );

      if (occurrence) {
        return {
          difficultWord,
          occurrence
        };
      }
    }

    return undefined;
  }

  private showCard(
    event: MouseEvent,
    view: EditorView,
    result: DocumentAnalysisResult,
    match: HoverMatch
  ): void {
    this.hideCard(false);

    const favorite = this.plugin.vocabularyStore.get(match.occurrence.normalizedWord);
    const card = document.createElement("div");
    card.classList.add("lexinote-hover-card");
    card.addEventListener("mousedown", (mouseEvent) => {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
    });

    const title = document.createElement("div");
    title.classList.add("lexinote-hover-title");
    title.textContent = match.occurrence.word;

    const meaning = document.createElement("div");
    meaning.classList.add("lexinote-hover-meaning");
    meaning.textContent = match.difficultWord.meaning || NO_LOCAL_MEANING_TEXT;

    const meta = document.createElement("div");
    meta.classList.add("lexinote-hover-meta");
    meta.textContent = `${match.difficultWord.dictionaryName} · ${match.difficultWord.difficulty}`;

    const button = document.createElement("button");
    button.classList.add("lexinote-hover-action");
    button.type = "button";
    button.textContent = favorite ? "取消收藏" : "收藏";
    button.addEventListener("click", (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();

      if (favorite) {
        this.plugin.vocabularyStore.remove(match.occurrence.normalizedWord);
      } else {
        this.plugin.vocabularyStore.add(
          match.occurrence.dictionaryEntry,
          match.occurrence.word
        );
      }

      this.plugin.reanalyzeEditorContent(result.filePath, view.state.doc.toString());
      this.hideCard();
    });

    card.append(title, meaning, meta, button);
    document.body.appendChild(card);
    this.cardEl = card;
    this.positionCard(event);
  }

  private positionCard(event: MouseEvent): void {
    if (!this.cardEl) {
      return;
    }

    const offset = 12;
    const rect = this.cardEl.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - offset;
    const maxTop = window.innerHeight - rect.height - offset;
    const left = Math.max(offset, Math.min(event.clientX + offset, maxLeft));
    const top = Math.max(offset, Math.min(event.clientY + offset, maxTop));

    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.top = `${top}px`;
  }

  private hideCard(clearKey = true): void {
    this.cardEl?.remove();
    this.cardEl = undefined;

    if (clearKey) {
      this.currentKey = undefined;
    }
  }
}
