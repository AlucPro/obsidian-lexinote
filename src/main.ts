import { Notice, Plugin } from "obsidian";
import type { Editor, MarkdownFileInfo } from "obsidian";
import { Analyzer } from "./analysis/Analyzer";
import {
  BUILT_IN_DICTIONARY_IDS,
  DEFAULT_SETTINGS,
  LIBRARY_VIEW_TYPE,
  SIDEBAR_VIEW_TYPE
} from "./constants";
import { DictionaryService } from "./dictionary/DictionaryService";
import { DictionaryImporter } from "./dictionary/DictionaryImporter";
import { EditorHighlighter } from "./editor/EditorHighlighter";
import { HoverProvider } from "./editor/HoverProvider";
import { FallbackDefinitionClient } from "./fallback/FallbackDefinitionClient";
import { LEXINOTE_ICON_ID } from "./icons";
import { LexiNoteSettingsTab } from "./settings/SettingsTab";
import { AnalysisStore } from "./stores/AnalysisStore";
import { VocabularyStore } from "./stores/VocabularyStore";
import { SidebarView } from "./views/SidebarView";
import { VocabularyLibraryView } from "./views/VocabularyLibraryView";
import cet4Dictionary from "../resources/dictionaries/cet4.json";
import cet6Dictionary from "../resources/dictionaries/cet6.json";
import type {
  CustomDictionarySnapshot,
  DictionaryEntry,
  FavoriteWord,
  ImportResult,
  LexiNotePluginData,
  LexiNoteSettings,
  RefreshReason
} from "./types";
import type { ImportOptions } from "./dictionary/DictionaryImporter";

export default class LexiNotePlugin extends Plugin {
  settings: LexiNoteSettings = { ...DEFAULT_SETTINGS };
  favorites: Record<string, FavoriteWord> = {};
  customDictionarySnapshots: CustomDictionarySnapshot[] = [];
  dictionaryService: DictionaryService = new DictionaryService();
  dictionaryImporter: DictionaryImporter = new DictionaryImporter();
  vocabularyStore: VocabularyStore = new VocabularyStore(this.favorites);
  analysisStore: AnalysisStore = new AnalysisStore();
  analyzer: Analyzer = new Analyzer();
  highlighter?: EditorHighlighter;
  hoverProvider?: HoverProvider;
  fallbackClient: FallbackDefinitionClient = new FallbackDefinitionClient();
  private reanalyzeTimer?: number;
  private pendingEditorAnalysis?:
    | {
        filePath: string;
        text: string;
      }
    | undefined;

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.dictionaryService = new DictionaryService();
    this.dictionaryImporter = new DictionaryImporter();
    this.dictionaryService.loadBuiltIn(this.loadBuiltInDictionaryFixtures());
    this.dictionaryService.setCustomSnapshots(this.customDictionarySnapshots);
    this.dictionaryService.rebuildEffectiveDictionary(this.settings);

    this.analysisStore = new AnalysisStore();
    this.vocabularyStore = new VocabularyStore(
      this.favorites,
      () => this.savePluginData(),
      () => {
        this.queueReanalyzeActiveDocument("favorites-change");
      }
    );
    this.analyzer = new Analyzer();
    this.fallbackClient = new FallbackDefinitionClient();
    this.highlighter = new EditorHighlighter(this.app);
    this.hoverProvider = new HoverProvider(this);

    this.addRibbonIcon(LEXINOTE_ICON_ID, "Open current document word list", () => {
      void this.activateSidebarView();
    });

    this.addCommand({
      id: "reanalyze-active-document",
      name: "Reanalyze active document",
      callback: () => {
        void this.reanalyzeActiveDocument("active-file-change");
      }
    });

    this.addCommand({
      id: "open-current-document-word-list",
      name: "Open current document word list",
      callback: () => {
        void this.activateSidebarView();
      }
    });

    this.addCommand({
      id: "open-vocabulary-library",
      name: "Open vocabulary library",
      callback: () => {
        void this.activateLibraryView();
      }
    });

    this.registerViews();
    this.registerEditorIntegration();
    this.addSettingTab(new LexiNoteSettingsTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        void this.reanalyzeActiveDocument("active-file-change");
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        this.queueReanalyzeEditorContent(editor, info);
      })
    );

    await this.reanalyzeActiveDocument("startup");
  }

  onunload(): void {
    if (this.reanalyzeTimer) {
      activeWindow.clearTimeout(this.reanalyzeTimer);
    }
  }

  async loadPluginData(): Promise<void> {
    const rawData = (await this.loadData()) as Partial<LexiNotePluginData> | null;
    const hydratedData = this.hydratePluginData(rawData);

    this.settings = hydratedData.settings;
    this.favorites = hydratedData.favorites;
    this.customDictionarySnapshots = hydratedData.customDictionarySnapshots ?? [];
  }

  async savePluginData(): Promise<void> {
    const data: LexiNotePluginData = {
      settings: this.settings,
      favorites: this.favorites,
      customDictionarySnapshots: this.customDictionarySnapshots
    };

    await this.saveData(data);
  }

  refreshDictionary(): void {
    this.dictionaryService.setCustomSnapshots(this.customDictionarySnapshots);
    this.dictionaryService.rebuildEffectiveDictionary(this.settings);
  }

  async updateSettings(settings: Partial<LexiNoteSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...settings
    };

    this.settings.userDifficulty = this.normalizeUserDifficulty(
      this.settings.userDifficulty
    );

    if (!Array.isArray(this.settings.enabledDictionaryIds)) {
      this.settings.enabledDictionaryIds = [...BUILT_IN_DICTIONARY_IDS];
    }

    if (!Array.isArray(this.settings.dictionaryOrder)) {
      this.settings.dictionaryOrder = [...this.settings.enabledDictionaryIds];
    }

    if (this.settings.enabledDictionaryIds.length === 0) {
      this.settings.enabledDictionaryIds = [...BUILT_IN_DICTIONARY_IDS];
    }

    if (this.settings.dictionaryOrder.length === 0) {
      this.settings.dictionaryOrder = [...this.settings.enabledDictionaryIds];
    }

    if (!Number.isFinite(this.settings.userDifficulty) || this.settings.userDifficulty <= 0) {
      this.settings.userDifficulty = DEFAULT_SETTINGS.userDifficulty;
    }

    if (!this.settings.highlightColor.trim()) {
      this.settings.highlightColor = DEFAULT_SETTINGS.highlightColor;
    }

    if (
      this.settings.highlightStyle !== "background" &&
      this.settings.highlightStyle !== "underline"
    ) {
      this.settings.highlightStyle = DEFAULT_SETTINGS.highlightStyle;
    }

    if (
      this.settings.underlineStyle !== "solid" &&
      this.settings.underlineStyle !== "wavy"
    ) {
      this.settings.underlineStyle = DEFAULT_SETTINGS.underlineStyle;
    }

    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("settings-change");
  }

  async importCustomDictionary(options: ImportOptions): Promise<ImportResult> {
    const dictionaryName = options.dictionaryName.trim();

    if (this.isDuplicateDictionaryName(dictionaryName)) {
      const result: ImportResult = {
        successCount: 0,
        failedCount: 1,
        skippedCount: 0,
        errors: [
          {
            message: `Dictionary name already exists: ${dictionaryName}`
          }
        ]
      };
      new Notice("Dictionary name already exists.");
      return result;
    }

    const result = this.dictionaryImporter.import(options);

    if (!result.snapshot) {
      new Notice("Dictionary import failed.");
      return result;
    }

    const snapshot: CustomDictionarySnapshot = {
      ...result.snapshot,
      id: this.createCustomDictionaryId(result.snapshot),
      enabled: true,
      order: this.settings.dictionaryOrder.length
    };
    this.customDictionarySnapshots = [...this.customDictionarySnapshots, snapshot];
    this.settings.enabledDictionaryIds = [
      ...new Set([...this.settings.enabledDictionaryIds, snapshot.id])
    ];
    this.settings.dictionaryOrder = [
      ...this.settings.dictionaryOrder.filter((id) => id !== snapshot.id),
      snapshot.id
    ];

    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("dictionary-change");
    new Notice(`Imported ${result.successCount} words into LexiNote.`);

    return result;
  }

  async setDictionaryEnabled(
    dictionaryId: string,
    enabled: boolean
  ): Promise<void> {
    const enabledIds = new Set(this.settings.enabledDictionaryIds);

    if (enabled) {
      enabledIds.add(dictionaryId);
    } else {
      enabledIds.delete(dictionaryId);
    }

    this.settings.enabledDictionaryIds = Array.from(enabledIds);
    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("settings-change");
  }

  async moveDictionary(dictionaryId: string, direction: -1 | 1): Promise<void> {
    const rows = this.getDictionaryRows();
    const orderedIds = rows.map((row) => row.id);
    const currentIndex = orderedIds.indexOf(dictionaryId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) {
      return;
    }

    [orderedIds[currentIndex], orderedIds[nextIndex]] = [
      orderedIds[nextIndex],
      orderedIds[currentIndex]
    ];
    this.settings.dictionaryOrder = orderedIds;
    this.customDictionarySnapshots = this.customDictionarySnapshots.map((snapshot) => ({
      ...snapshot,
      order: orderedIds.indexOf(snapshot.id)
    }));
    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("settings-change");
  }

  async updateCustomDictionary(
    dictionaryId: string,
    updates: { dictionaryName?: string; difficulty?: number }
  ): Promise<boolean> {
    const nextName = updates.dictionaryName?.trim();

    if (
      nextName &&
      this.isDuplicateDictionaryName(nextName, dictionaryId)
    ) {
      new Notice("Dictionary name already exists.");
      return false;
    }

    this.customDictionarySnapshots = this.customDictionarySnapshots.map((snapshot) => {
      if (snapshot.id !== dictionaryId) {
        return snapshot;
      }

      const dictionaryName = nextName || snapshot.dictionaryName;
      const difficulty =
        updates.difficulty === undefined
          ? snapshot.difficulty
          : this.normalizeDictionaryDifficulty(updates.difficulty);

      return {
        ...snapshot,
        dictionaryName,
        difficulty,
        entries: snapshot.entries.map((entry) => ({
          ...entry,
          dictionaryName,
          difficulty
        }))
      };
    });
    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("dictionary-change");
    return true;
  }

  async removeCustomDictionary(dictionaryId: string): Promise<void> {
    this.customDictionarySnapshots = this.customDictionarySnapshots.filter(
      (snapshot) => snapshot.id !== dictionaryId
    );
    this.settings.enabledDictionaryIds = this.settings.enabledDictionaryIds.filter(
      (id) => id !== dictionaryId
    );
    this.settings.dictionaryOrder = this.settings.dictionaryOrder.filter(
      (id) => id !== dictionaryId
    );
    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("dictionary-change");
  }

  getDictionaryRows(): ReturnType<DictionaryService["getDictionaryRows"]> {
    return this.dictionaryService.getDictionaryRows(this.settings);
  }

  async reanalyzeActiveDocument(reason: RefreshReason): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile || activeFile.extension !== "md") {
      this.analysisStore.setCurrent(undefined);
      this.highlighter?.update(undefined, this.settings);
      return;
    }

    const text = await this.app.vault.read(activeFile);
    const result = this.analyzer.analyze({
      filePath: activeFile.path,
      text,
      settings: this.settings,
      dictionary: this.dictionaryService,
      favorites: this.favorites
    });

    this.analysisStore.setCurrent(result);
    this.highlighter?.update(result, this.settings);

    if (reason === "startup" || reason === "active-file-change") {
      new Notice(`LexiNote found ${result.difficultWords.length} difficult words.`);
    }
  }

  reanalyzeEditorContent(filePath: string, text: string): void {
    const result = this.analyzer.analyze({
      filePath,
      text,
      settings: this.settings,
      dictionary: this.dictionaryService,
      favorites: this.favorites
    });

    this.analysisStore.setCurrent(result);
    this.highlighter?.update(result, this.settings);
  }

  registerViews(): void {
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, this));
    this.registerView(
      LIBRARY_VIEW_TYPE,
      (leaf) => new VocabularyLibraryView(leaf, this)
    );
  }

  registerEditorIntegration(): void {
    if (this.highlighter) {
      this.registerEditorExtension(this.highlighter.buildExtension());
    }

    if (this.hoverProvider) {
      this.registerEditorExtension(this.hoverProvider.buildExtension());
    }
  }

  async activateSidebarView(): Promise<void> {
    const existingLeaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);

    if (existingLeaves.length === 0) {
      const leaf = this.app.workspace.getRightLeaf(false);

      if (!leaf) {
        new Notice("Unable to open sidebar.");
        return;
      }

      await leaf.setViewState({
        type: SIDEBAR_VIEW_TYPE,
        active: true
      });
    }

    const sidebarLeaf = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE)[0];

    if (sidebarLeaf) {
      this.app.workspace.setActiveLeaf(sidebarLeaf, { focus: true });
    }

    await this.reanalyzeActiveDocument("active-file-change");
  }

  async activateLibraryView(): Promise<void> {
    const existingLeaves = this.app.workspace.getLeavesOfType(LIBRARY_VIEW_TYPE);

    if (existingLeaves.length === 0) {
      const leaf = this.app.workspace.getRightLeaf(false);

      if (!leaf) {
        new Notice("Unable to open vocabulary library.");
        return;
      }

      await leaf.setViewState({
        type: LIBRARY_VIEW_TYPE,
        active: true
      });
    }

    const libraryLeaf = this.app.workspace.getLeavesOfType(LIBRARY_VIEW_TYPE)[0];

    if (libraryLeaf) {
      this.app.workspace.setActiveLeaf(libraryLeaf, { focus: true });
    }
  }

  private hydratePluginData(
    rawData: Partial<LexiNotePluginData> | null
  ): LexiNotePluginData {
    const rawSettings =
      rawData?.settings && typeof rawData.settings === "object"
        ? rawData.settings
        : undefined;
    const customDictionarySnapshots = this.hydrateCustomDictionarySnapshots(rawData);
    const hydratedSettings: LexiNoteSettings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings
    };

    hydratedSettings.userDifficulty = this.normalizeUserDifficulty(
      hydratedSettings.userDifficulty
    );

    if (!hydratedSettings.highlightColor) {
      hydratedSettings.highlightColor = DEFAULT_SETTINGS.highlightColor;
    }

    if (
      hydratedSettings.highlightStyle !== "background" &&
      hydratedSettings.highlightStyle !== "underline"
    ) {
      hydratedSettings.highlightStyle = DEFAULT_SETTINGS.highlightStyle;
    }

    if (
      hydratedSettings.underlineStyle !== "solid" &&
      hydratedSettings.underlineStyle !== "wavy"
    ) {
      hydratedSettings.underlineStyle = DEFAULT_SETTINGS.underlineStyle;
    }

    hydratedSettings.enabledDictionaryIds = this.hydrateEnabledDictionaryIds(
      hydratedSettings.enabledDictionaryIds,
      customDictionarySnapshots
    );
    hydratedSettings.dictionaryOrder = this.hydrateDictionaryOrder(
      hydratedSettings.dictionaryOrder,
      customDictionarySnapshots
    );

    return {
      settings: hydratedSettings,
      favorites: this.hydrateFavorites(rawData?.favorites),
      customDictionarySnapshots,
      metrics: rawData?.metrics
    };
  }

  private hydrateFavorites(
    favorites?: Record<string, FavoriteWord>
  ): Record<string, FavoriteWord> {
    if (!favorites || typeof favorites !== "object") {
      return {};
    }

    return favorites;
  }

  private hydrateCustomDictionarySnapshots(
    rawData: Partial<LexiNotePluginData> | null
  ): CustomDictionarySnapshot[] {
    const rawSnapshots = Array.isArray(rawData?.customDictionarySnapshots)
      ? rawData.customDictionarySnapshots
      : rawData?.customDictionarySnapshot
        ? [rawData.customDictionarySnapshot]
        : [];

    return rawSnapshots
      .filter((snapshot) => snapshot && Array.isArray(snapshot.entries))
      .map((snapshot, index) => {
        const id =
          typeof snapshot.id === "string" && snapshot.id.trim()
            ? snapshot.id
            : this.createCustomDictionaryId(snapshot, index);
        const difficulty = this.normalizeDictionaryDifficulty(snapshot.difficulty);
        const dictionaryName =
          typeof snapshot.dictionaryName === "string" && snapshot.dictionaryName.trim()
            ? snapshot.dictionaryName.trim()
            : `Custom dictionary ${index + 1}`;

        return {
          ...snapshot,
          id,
          dictionaryName,
          difficulty,
          enabled: snapshot.enabled !== false,
          order: Number.isFinite(snapshot.order) ? snapshot.order : index,
          entries: snapshot.entries
            .filter(this.isDictionaryEntryLike)
            .map((entry) => ({
              ...entry,
              dictionaryId: id,
              dictionaryName,
              difficulty,
              source: "custom" as const
            }))
        };
      });
  }

  private hydrateEnabledDictionaryIds(
    value: unknown,
    snapshots: CustomDictionarySnapshot[]
  ): string[] {
    if (Array.isArray(value)) {
      const ids = value.filter((item): item is string => typeof item === "string");
      if (ids.length > 0) {
        return ids;
      }
    }

    return [
      ...BUILT_IN_DICTIONARY_IDS,
      ...snapshots.filter((snapshot) => snapshot.enabled).map((snapshot) => snapshot.id)
    ];
  }

  private hydrateDictionaryOrder(
    value: unknown,
    snapshots: CustomDictionarySnapshot[]
  ): string[] {
    const allIds = [
      ...BUILT_IN_DICTIONARY_IDS,
      ...snapshots
        .sort((left, right) => left.order - right.order)
        .map((snapshot) => snapshot.id)
    ];

    if (Array.isArray(value)) {
      const orderedIds = value.filter((item): item is string => typeof item === "string");
      return [...orderedIds, ...allIds.filter((id) => !orderedIds.includes(id))];
    }

    return allIds;
  }

  private normalizeUserDifficulty(value: unknown): number {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return DEFAULT_SETTINGS.userDifficulty;
    }

    return Math.min(30, Math.max(1, Math.round(numericValue)));
  }

  private normalizeDictionaryDifficulty(value: unknown): number {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return DEFAULT_SETTINGS.userDifficulty + 1;
    }

    return Math.min(30, Math.max(1, Math.round(numericValue)));
  }

  private createCustomDictionaryId(
    snapshot: Pick<CustomDictionarySnapshot, "dictionaryName" | "importedAt">,
    fallbackIndex = this.customDictionarySnapshots.length
  ): string {
    const normalizedName = snapshot.dictionaryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const suffix = normalizedName || `dictionary-${fallbackIndex + 1}`;

    return `custom:${snapshot.importedAt}:${suffix}`;
  }

  private isDuplicateDictionaryName(
    dictionaryName: string,
    exceptDictionaryId?: string
  ): boolean {
    const normalizedName = dictionaryName.trim().toLowerCase();

    if (!normalizedName) {
      return false;
    }

    const builtInNames = new Set(["cet4", "cet6"]);
    if (builtInNames.has(normalizedName)) {
      return true;
    }

    return this.customDictionarySnapshots.some(
      (snapshot) =>
        snapshot.id !== exceptDictionaryId &&
        snapshot.dictionaryName.trim().toLowerCase() === normalizedName
    );
  }

  private isDictionaryEntryLike(this: void, entry: DictionaryEntry): boolean {
    return (
      Boolean(entry) &&
      typeof entry.word === "string" &&
      typeof entry.normalizedWord === "string" &&
      entry.normalizedWord.length > 0 &&
      Number.isFinite(entry.difficulty) &&
      entry.difficulty > 0
    );
  }

  private loadBuiltInDictionaryFixtures(): DictionaryEntry[] {
    return [
      ...(cet4Dictionary as unknown[]),
      ...(cet6Dictionary as unknown[])
    ].filter(this.isDictionaryEntry);
  }


  private isDictionaryEntry(this: void, entry: unknown): entry is DictionaryEntry {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const candidate = entry as DictionaryEntry;

    return (
      typeof candidate.word === "string" &&
      typeof candidate.normalizedWord === "string" &&
      typeof candidate.dictionaryName === "string" &&
      Number.isFinite(candidate.difficulty) &&
      candidate.difficulty > 0 &&
      candidate.source === "built-in"
    );
  }

  private queueReanalyzeActiveDocument(reason: RefreshReason): void {
    if (this.reanalyzeTimer) {
      activeWindow.clearTimeout(this.reanalyzeTimer);
    }

    this.reanalyzeTimer = activeWindow.setTimeout(() => {
      void this.reanalyzeActiveDocument(reason);
    }, 300);
  }

  private queueReanalyzeEditorContent(
    editor: Editor,
    info: MarkdownFileInfo
  ): void {
    const file = info.file;

    if (!file || file.extension !== "md") {
      this.analysisStore.setCurrent(undefined);
      this.highlighter?.update(undefined, this.settings);
      return;
    }

    this.pendingEditorAnalysis = {
      filePath: file.path,
      text: editor.getValue()
    };

    if (this.reanalyzeTimer) {
      activeWindow.clearTimeout(this.reanalyzeTimer);
    }

    this.reanalyzeTimer = activeWindow.setTimeout(() => {
      const pendingAnalysis = this.pendingEditorAnalysis;
      this.pendingEditorAnalysis = undefined;

      if (pendingAnalysis) {
        this.reanalyzeEditorContent(pendingAnalysis.filePath, pendingAnalysis.text);
      }
    }, 300);
  }
}
