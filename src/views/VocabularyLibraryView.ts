import { ItemView, Setting, setIcon } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { LIBRARY_VIEW_TYPE } from "../constants";
import { LEXINOTE_ICON_ID } from "../icons";
import { t } from "../i18n";
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
    return t("viewVocabularyLibrary");
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
      activeWindow.clearTimeout(this.searchTimer);
    }

    return Promise.resolve();
  }

  private renderShell(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.replaceChildren();
    container.classList.add("lexinote-library");

    const heading = new Setting(container).setName("").setHeading();
    heading.settingEl.classList.add(
      "lexinote-panel-heading",
      "lexinote-library-heading"
    );

    const headingIcon = activeDocument.createElement("span");
    headingIcon.classList.add("lexinote-panel-heading-icon");
    setIcon(headingIcon, LEXINOTE_ICON_ID);

    const headingText = activeDocument.createElement("span");
    headingText.textContent = t("sidebarMyVocabulary");

    heading.nameEl.replaceChildren(headingIcon, headingText);

    const controls = this.createControls();
    const exportControls = this.createExportControls();
    this.listContainerEl = activeDocument.createElement("div");
    this.listContainerEl.classList.add("lexinote-library-results");

    container.append(controls, exportControls, this.listContainerEl);
    this.renderList();
  }

  private renderList(): void {
    if (!this.listContainerEl) {
      return;
    }

    this.listContainerEl.replaceChildren();
    const words = this.plugin.vocabularyStore.search(this.searchQuery, this.sortMode);

    if (words.length === 0) {
      const empty = activeDocument.createElement("p");
      empty.classList.add("lexinote-empty-state");
      empty.textContent = this.searchQuery
        ? t("libraryNoMatches")
        : t("libraryEmpty");
      this.listContainerEl.appendChild(empty);
      return;
    }

    const list = activeDocument.createElement("div");
    list.classList.add("lexinote-library-list");

    for (const word of words) {
      list.appendChild(this.createWordItem(word));
    }

    this.listContainerEl.appendChild(list);
  }

  private createControls(): HTMLElement {
    const controls = activeDocument.createElement("div");
    controls.classList.add("lexinote-library-controls");

    const searchInput = activeDocument.createElement("input");
    searchInput.classList.add("lexinote-library-search");
    searchInput.type = "search";
    searchInput.placeholder = t("librarySearchPlaceholder");
    searchInput.value = this.searchQuery;
    searchInput.addEventListener("input", () => {
      if (this.searchTimer) {
        activeWindow.clearTimeout(this.searchTimer);
      }

      this.searchTimer = activeWindow.setTimeout(() => {
        this.searchQuery = searchInput.value;
        this.renderList();
      }, 200);
    });

    const sortSelect = activeDocument.createElement("select");
    sortSelect.classList.add("lexinote-library-sort");
    this.appendSortOption(sortSelect, "created-desc", t("librarySortNewest"));
    this.appendSortOption(sortSelect, "created-asc", t("librarySortOldest"));
    this.appendSortOption(sortSelect, "word-asc", t("librarySortAZ"));
    this.appendSortOption(sortSelect, "word-desc", t("librarySortZA"));
    sortSelect.value = this.sortMode;
    sortSelect.addEventListener("change", () => {
      this.sortMode = sortSelect.value as VocabularySortMode;
      this.renderList();
    });

    controls.append(searchInput, sortSelect);
    return controls;
  }

  private createExportControls(): HTMLElement {
    const controls = activeDocument.createElement("div");
    controls.classList.add("lexinote-library-export-controls");

    const jsonButton = this.createExportButton(t("libraryExportJson"), () => {
      this.plugin.exportVocabulary("lexinote-json");
    });
    const ankiButton = this.createExportButton(t("libraryExportAnkiTsv"), () => {
      this.plugin.exportVocabulary("anki-tsv");
    });

    controls.append(jsonButton, ankiButton);
    return controls;
  }

  private createExportButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = activeDocument.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  private appendSortOption(
    select: HTMLSelectElement,
    value: VocabularySortMode,
    label: string
  ): void {
    const option = activeDocument.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  private createWordItem(word: FavoriteWord): HTMLElement {
    const item = activeDocument.createElement("div");
    item.classList.add("lexinote-library-item");

    const header = activeDocument.createElement("div");
    header.classList.add("lexinote-library-item-header");

    const title = activeDocument.createElement("div");
    title.classList.add("lexinote-word-title");
    title.textContent = word.word;

    const actions = activeDocument.createElement("div");
    actions.classList.add("lexinote-library-actions");

    const knownButton = activeDocument.createElement("button");
    knownButton.type = "button";
    knownButton.textContent = word.known
      ? t("libraryUnmarkKnown")
      : t("libraryMarkKnown");
    knownButton.addEventListener("click", () => {
      this.plugin.vocabularyStore.toggleKnown(word.normalizedWord);
      void this.plugin.reanalyzeActiveDocument("favorites-change");
    });

    const deleteButton = activeDocument.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = t("actionDelete");
    deleteButton.addEventListener("click", () => {
      this.plugin.vocabularyStore.remove(word.normalizedWord);
      void this.plugin.reanalyzeActiveDocument("favorites-change");
    });

    actions.append(knownButton, deleteButton);
    header.append(title, actions);

    const meaning = activeDocument.createElement("div");
    meaning.classList.add("lexinote-word-meaning");
    meaning.textContent = formatMeaningText(word.meaning, t("noLocalMeaning"));

    const meta = activeDocument.createElement("div");
    meta.classList.add("lexinote-word-meta");
    meta.textContent = `${this.formatDictionaryMeta(word)} · ${this.formatDate(
      word.createdAt
    )} · ${word.known ? t("libraryKnown") : t("libraryNotKnown")}`;

    item.append(header, meaning, meta);
    return item;
  }

  private formatDictionaryMeta(word: FavoriteWord): string {
    if (!word.dictionaryName || !word.difficulty) {
      return t("unknown");
    }

    return `${word.dictionaryName} · ${word.difficulty}`;
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}
