import { ItemView, Setting, setIcon } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { LIBRARY_VIEW_TYPE, NO_LOCAL_MEANING_TEXT } from "../constants";
import { LEXINOTE_ICON_ID } from "../icons";
import { formatMeaningText } from "../ui/meaningText";
import type { FavoriteWord } from "../types";
import type { VocabularySortMode } from "../stores/VocabularyStore";
import type LexiNotePlugin from "../main";

export class VocabularyLibraryView extends ItemView {
  private unsubscribe?: () => void;
  private searchQuery = "";
  private sortMode: VocabularySortMode = "created-desc";
  private searchTimer?: number;
  private listContainerEl?: HTMLElement;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: LexiNotePlugin) {
    super(leaf);
  }

  getViewType(): string {
    return LIBRARY_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Vocabulary library";
  }

  getIcon(): string {
    return LEXINOTE_ICON_ID;
  }

  onOpen(): Promise<void> {
    this.renderShell();
    this.unsubscribe = this.plugin.vocabularyStore.subscribe(() => {
      this.renderList();
    });

    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;

    if (this.searchTimer) {
      window.clearTimeout(this.searchTimer);
    }

    return Promise.resolve();
  }

  private renderShell(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.replaceChildren();
    container.classList.add("lexinote-library");

    const heading = new Setting(container).setName("").setHeading();
    heading.settingEl.classList.add("lexinote-panel-heading");

    const headingIcon = document.createElement("span");
    headingIcon.classList.add("lexinote-panel-heading-icon");
    setIcon(headingIcon, LEXINOTE_ICON_ID);

    const headingText = document.createElement("span");
    headingText.textContent = "My vocabulary";

    heading.nameEl.replaceChildren(headingIcon, headingText);

    const controls = this.createControls();
    this.listContainerEl = document.createElement("div");
    this.listContainerEl.classList.add("lexinote-library-results");

    container.append(controls, this.listContainerEl);
    this.renderList();
  }

  private renderList(): void {
    if (!this.listContainerEl) {
      return;
    }

    this.listContainerEl.replaceChildren();
    const words = this.plugin.vocabularyStore.search(this.searchQuery, this.sortMode);

    if (words.length === 0) {
      const empty = document.createElement("p");
      empty.classList.add("lexinote-empty-state");
      empty.textContent = this.searchQuery
        ? "No matching favorite words."
        : "No favorite words yet.";
      this.listContainerEl.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.classList.add("lexinote-library-list");

    for (const word of words) {
      list.appendChild(this.createWordItem(word));
    }

    this.listContainerEl.appendChild(list);
  }

  private createControls(): HTMLElement {
    const controls = document.createElement("div");
    controls.classList.add("lexinote-library-controls");

    const searchInput = document.createElement("input");
    searchInput.classList.add("lexinote-library-search");
    searchInput.type = "search";
    searchInput.placeholder = "Search word or meaning";
    searchInput.value = this.searchQuery;
    searchInput.addEventListener("input", () => {
      if (this.searchTimer) {
        window.clearTimeout(this.searchTimer);
      }

      this.searchTimer = window.setTimeout(() => {
        this.searchQuery = searchInput.value;
        this.renderList();
      }, 200);
    });

    const sortSelect = document.createElement("select");
    sortSelect.classList.add("lexinote-library-sort");
    this.appendSortOption(sortSelect, "created-desc", "Newest first");
    this.appendSortOption(sortSelect, "created-asc", "Oldest first");
    this.appendSortOption(sortSelect, "word-asc", "A-Z");
    this.appendSortOption(sortSelect, "word-desc", "Z-A");
    sortSelect.value = this.sortMode;
    sortSelect.addEventListener("change", () => {
      this.sortMode = sortSelect.value as VocabularySortMode;
      this.renderList();
    });

    controls.append(searchInput, sortSelect);
    return controls;
  }

  private appendSortOption(
    select: HTMLSelectElement,
    value: VocabularySortMode,
    label: string
  ): void {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  private createWordItem(word: FavoriteWord): HTMLElement {
    const item = document.createElement("div");
    item.classList.add("lexinote-library-item");

    const header = document.createElement("div");
    header.classList.add("lexinote-library-item-header");

    const title = document.createElement("div");
    title.classList.add("lexinote-word-title");
    title.textContent = word.word;

    const actions = document.createElement("div");
    actions.classList.add("lexinote-library-actions");

    const knownButton = document.createElement("button");
    knownButton.type = "button";
    knownButton.textContent = word.known ? "取消熟悉" : "标熟";
    knownButton.addEventListener("click", () => {
      this.plugin.vocabularyStore.toggleKnown(word.normalizedWord);
      void this.plugin.reanalyzeActiveDocument("favorites-change");
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => {
      this.plugin.vocabularyStore.remove(word.normalizedWord);
      void this.plugin.reanalyzeActiveDocument("favorites-change");
    });

    actions.append(knownButton, deleteButton);
    header.append(title, actions);

    const meaning = document.createElement("div");
    meaning.classList.add("lexinote-word-meaning");
    meaning.textContent = formatMeaningText(word.meaning, NO_LOCAL_MEANING_TEXT);

    const meta = document.createElement("div");
    meta.classList.add("lexinote-word-meta");
    meta.textContent = `${this.formatDictionaryMeta(word)} · ${this.formatDate(
      word.createdAt
    )} · ${word.known ? "已熟悉" : "未熟悉"}`;

    item.append(header, meaning, meta);
    return item;
  }

  private formatDictionaryMeta(word: FavoriteWord): string {
    if (!word.dictionaryName || !word.difficulty) {
      return "Unknown";
    }

    return `${word.dictionaryName} · ${word.difficulty}`;
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}
