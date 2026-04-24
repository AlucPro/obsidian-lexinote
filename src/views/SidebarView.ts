import { ItemView, Setting, setIcon } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { NO_LOCAL_MEANING_TEXT, SIDEBAR_VIEW_TYPE } from "../constants";
import { LEXINOTE_ICON_ID } from "../icons";
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
    return "Current document word list";
  }

  getIcon(): string {
    return LEXINOTE_ICON_ID;
  }

  onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.analysisStore.subscribe((result) => {
      this.currentResult = result;
      this.render();
    });

    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;

    return Promise.resolve();
  }

  private render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.replaceChildren();
    container.classList.add("lexinote-sidebar");

    const toolbar = activeDocument.createElement("div");
    toolbar.classList.add("lexinote-sidebar-toolbar");

    const heading = new Setting(toolbar).setName("").setHeading();
    heading.settingEl.classList.add("lexinote-panel-heading");

    const headingIcon = activeDocument.createElement("span");
    headingIcon.classList.add("lexinote-panel-heading-icon");
    setIcon(headingIcon, LEXINOTE_ICON_ID);

    const headingText = activeDocument.createElement("span");
    headingText.textContent = "Current difficult words";

    heading.nameEl.replaceChildren(headingIcon, headingText);

    const libraryButton = activeDocument.createElement("button");
    libraryButton.classList.add("lexinote-sidebar-library-button");
    libraryButton.type = "button";
    libraryButton.textContent = "My vocabulary";
    libraryButton.addEventListener("click", () => {
      void this.plugin.activateLibraryView();
    });

    toolbar.append(libraryButton);
    container.appendChild(toolbar);

    if (!this.currentResult) {
      this.appendEmptyState(container, "No active Markdown document.");
      return;
    }

    if (this.currentResult.difficultWords.length === 0) {
      this.appendEmptyState(container, "No difficult words found.");
      return;
    }

    const list = activeDocument.createElement("div");
    list.addClass("lexinote-word-list");

    for (const word of this.currentResult.difficultWords) {
      const item = activeDocument.createElement("div");
      item.classList.add("lexinote-word-item");

      const header = activeDocument.createElement("div");
      header.classList.add("lexinote-word-header");

      const title = activeDocument.createElement("div");
      title.classList.add("lexinote-word-title");
      title.textContent = word.word;

      const favorite = this.plugin.vocabularyStore.get(word.normalizedWord);
      const button = activeDocument.createElement("button");
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

      const meaning = activeDocument.createElement("div");
      meaning.classList.add("lexinote-word-meaning");
      meaning.textContent = formatMeaningText(word.meaning, NO_LOCAL_MEANING_TEXT);

      const meta = activeDocument.createElement("div");
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
    const empty = activeDocument.createElement("p");
    empty.classList.add("lexinote-empty-state");
    empty.textContent = message;
    container.appendChild(empty);
  }
}
