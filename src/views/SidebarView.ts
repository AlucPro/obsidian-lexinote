import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { NO_LOCAL_MEANING_TEXT, SIDEBAR_VIEW_TYPE } from "../constants";
import { formatMeaningText } from "../ui/meaningText";
import type { AnalyzedDifficultWord, DocumentAnalysisResult } from "../types";
import type LexiNotePlugin from "../main";

export class SidebarView extends ItemView {
  private unsubscribe?: () => void;
  private currentResult?: DocumentAnalysisResult;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: LexiNotePlugin) {
    super(leaf);
  }

  getViewType(): string {
    return SIDEBAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "LexiNote Current Document";
  }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.analysisStore.subscribe((result) => {
      this.currentResult = result;
      this.render();
    });
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.replaceChildren();
    container.classList.add("lexinote-sidebar");

    const toolbar = document.createElement("div");
    toolbar.classList.add("lexinote-sidebar-toolbar");

    const heading = document.createElement("h3");
    heading.textContent = "Current Difficult Words";

    const libraryButton = document.createElement("button");
    libraryButton.classList.add("lexinote-sidebar-library-button");
    libraryButton.type = "button";
    libraryButton.textContent = "My Vocabulary";
    libraryButton.addEventListener("click", () => {
      void this.plugin.activateLibraryView();
    });

    toolbar.append(heading, libraryButton);
    container.appendChild(toolbar);

    if (!this.currentResult) {
      this.appendEmptyState(container, "No active Markdown document.");
      return;
    }

    if (this.currentResult.difficultWords.length === 0) {
      this.appendEmptyState(container, "No difficult words found.");
      return;
    }

    const list = document.createElement("div");
    list.addClass("lexinote-word-list");

    for (const word of this.currentResult.difficultWords) {
      const item = document.createElement("div");
      item.classList.add("lexinote-word-item");

      const header = document.createElement("div");
      header.classList.add("lexinote-word-header");

      const title = document.createElement("div");
      title.classList.add("lexinote-word-title");
      title.textContent = word.word;

      const favorite = this.plugin.vocabularyStore.get(word.normalizedWord);
      const button = document.createElement("button");
      button.classList.add("lexinote-word-action");
      button.type = "button";
      button.textContent = favorite ? "取消收藏" : "收藏";
      button.setAttribute(
        "aria-label",
        `${favorite ? "取消收藏" : "收藏"} ${word.word}`
      );
      button.addEventListener("click", () => {
        this.toggleFavorite(word);
      });

      const meaning = document.createElement("div");
      meaning.classList.add("lexinote-word-meaning");
      meaning.textContent = formatMeaningText(word.meaning, NO_LOCAL_MEANING_TEXT);

      const meta = document.createElement("div");
      meta.classList.add("lexinote-word-meta");
      meta.textContent = `${word.dictionaryName} · ${word.difficulty}${
        favorite ? " · 已收藏" : ""
      }`;

      header.append(title, button);
      item.append(header, meaning, meta);
      list.appendChild(item);
    }

    container.appendChild(list);
  }

  private toggleFavorite(word: AnalyzedDifficultWord): void {
    if (this.plugin.vocabularyStore.get(word.normalizedWord)) {
      this.plugin.vocabularyStore.remove(word.normalizedWord);
    } else {
      this.plugin.vocabularyStore.add(
        word.occurrences[0].dictionaryEntry,
        word.word
      );
    }

    if (this.currentResult) {
      void this.plugin.reanalyzeActiveDocument("favorites-change");
    }
  }

  private appendEmptyState(container: Element, message: string): void {
    const empty = document.createElement("p");
    empty.classList.add("lexinote-empty-state");
    empty.textContent = message;
    container.appendChild(empty);
  }
}
