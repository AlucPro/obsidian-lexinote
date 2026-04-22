import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { NO_LOCAL_MEANING_TEXT, SIDEBAR_VIEW_TYPE } from "../constants";
import type { DocumentAnalysisResult } from "../types";
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

    const heading = document.createElement("h3");
    heading.textContent = "Current Difficult Words";
    container.appendChild(heading);

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

      const title = document.createElement("div");
      title.classList.add("lexinote-word-title");
      title.textContent = word.word;

      const meaning = document.createElement("div");
      meaning.classList.add("lexinote-word-meaning");
      meaning.textContent = word.meaning || NO_LOCAL_MEANING_TEXT;

      const meta = document.createElement("div");
      meta.classList.add("lexinote-word-meta");
      meta.textContent = `${word.dictionaryName} · ${word.difficulty}`;

      item.append(title, meaning, meta);
      list.appendChild(item);
    }

    container.appendChild(list);
  }

  private appendEmptyState(container: Element, message: string): void {
    const empty = document.createElement("p");
    empty.classList.add("lexinote-empty-state");
    empty.textContent = message;
    container.appendChild(empty);
  }
}
