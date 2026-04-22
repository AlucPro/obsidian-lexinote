import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { NO_LOCAL_MEANING_TEXT } from "../constants";
import { formatMeaningText } from "../ui/meaningText";
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
      mouseleave: (event) => {
        if (!this.isCardTarget(event.relatedTarget)) {
          this.hideCard();
        }
      }
    });
  }

  private handleMouseMove(event: MouseEvent, view: EditorView): void {
    const target = event.target;
    const highlightEl =
      target instanceof HTMLElement
        ? target.closest<HTMLElement>(".lexinote-highlight")
        : null;

    if (!highlightEl) {
      if (!this.isCardTarget(target)) {
        this.hideCard();
      }
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
      this.positionCard(highlightEl);
      return;
    }

    this.currentKey = nextKey;
    this.showCard(highlightEl, view, result, match);
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
    anchorEl: HTMLElement,
    view: EditorView,
    result: DocumentAnalysisResult,
    match: HoverMatch
  ): void {
    this.hideCard(false);

    const favorite = this.plugin.vocabularyStore.get(match.occurrence.normalizedWord);
    const card = document.createElement("div");
    card.classList.add("lexinote-hover-card");
    card.addEventListener("mouseleave", (event) => {
      if (!this.isHighlightTarget(event.relatedTarget)) {
        this.hideCard();
      }
    });
    card.addEventListener("mousedown", (mouseEvent) => {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
    });

    const title = document.createElement("div");
    title.classList.add("lexinote-hover-title");
    title.textContent = match.occurrence.word;

    const meaning = document.createElement("div");
    meaning.classList.add("lexinote-hover-meaning");
    meaning.textContent = formatMeaningText(
      match.difficultWord.meaning,
      NO_LOCAL_MEANING_TEXT
    );

    const fallbackStatus = document.createElement("div");
    fallbackStatus.classList.add("lexinote-hover-fallback-status");

    const fallbackButton = this.createFallbackButton(
      match.occurrence.word,
      match.difficultWord.meaning,
      meaning,
      fallbackStatus
    );

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

    card.append(title, meaning);

    if (fallbackButton) {
      card.append(fallbackButton, fallbackStatus);
    } else if (!match.difficultWord.meaning && this.plugin.settings.fallbackApiEnabled) {
      fallbackStatus.textContent = "fallback endpoint is not configured";
      card.append(fallbackStatus);
    }

    card.append(meta, button);
    document.body.appendChild(card);
    this.cardEl = card;
    this.positionCard(anchorEl);
  }

  private createFallbackButton(
    word: string,
    localMeaning: string | undefined,
    meaningEl: HTMLElement,
    statusEl: HTMLElement
  ): HTMLButtonElement | undefined {
    if (localMeaning || !this.plugin.settings.fallbackApiEnabled) {
      return undefined;
    }

    if (!this.plugin.settings.fallbackApiEndpoint?.trim()) {
      return undefined;
    }

    const button = document.createElement("button");
    button.classList.add("lexinote-hover-fallback-action");
    button.type = "button";
    button.textContent = "查询释义";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      statusEl.textContent = "查询中...";

      void this.plugin.fallbackClient
        .lookup(word, this.plugin.settings)
        .then((result) => {
          if (result.meaning) {
            meaningEl.textContent = formatMeaningText(
              result.meaning,
              NO_LOCAL_MEANING_TEXT
            );
            statusEl.textContent = "远程释义";
          } else {
            statusEl.textContent = result.error ?? "查询失败";
          }
        })
        .finally(() => {
          button.disabled = false;
        });
    });

    return button;
  }

  private positionCard(anchorEl: HTMLElement): void {
    if (!this.cardEl) {
      return;
    }

    const viewportMargin = 8;
    const anchorRect = anchorEl.getBoundingClientRect();
    const rect = this.cardEl.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - viewportMargin;
    const belowTop = anchorRect.bottom;
    const aboveTop = anchorRect.top - rect.height;
    const top =
      belowTop + rect.height <= window.innerHeight
        ? belowTop
        : Math.max(viewportMargin, aboveTop);
    const left = Math.max(
      viewportMargin,
      Math.min(anchorRect.left, Math.max(viewportMargin, maxLeft))
    );

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

  private isCardTarget(target: EventTarget | null): boolean {
    return target instanceof Node && Boolean(this.cardEl?.contains(target));
  }

  private isHighlightTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      Boolean(target.closest(".lexinote-highlight"))
    );
  }
}
