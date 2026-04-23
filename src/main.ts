import { Notice, Plugin } from "obsidian";
import type { Editor, MarkdownFileInfo } from "obsidian";
import { Analyzer } from "./analysis/Analyzer";
import { DEFAULT_SETTINGS, LIBRARY_VIEW_TYPE, SIDEBAR_VIEW_TYPE } from "./constants";
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
  customDictionarySnapshot?: CustomDictionarySnapshot;
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
    this.dictionaryService.setCustomSnapshot(this.customDictionarySnapshot);
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
      window.clearTimeout(this.reanalyzeTimer);
    }
  }

  async loadPluginData(): Promise<void> {
    const rawData = (await this.loadData()) as Partial<LexiNotePluginData> | null;
    const hydratedData = this.hydratePluginData(rawData);

    this.settings = hydratedData.settings;
    this.favorites = hydratedData.favorites;
    this.customDictionarySnapshot = hydratedData.customDictionarySnapshot;
  }

  async savePluginData(): Promise<void> {
    const data: LexiNotePluginData = {
      settings: this.settings,
      favorites: this.favorites,
      customDictionarySnapshot: this.customDictionarySnapshot
    };

    await this.saveData(data);
  }

  refreshDictionary(): void {
    this.dictionaryService.setCustomSnapshot(this.customDictionarySnapshot);
    this.dictionaryService.rebuildEffectiveDictionary(this.settings);
  }

  async updateSettings(settings: Partial<LexiNoteSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...settings
    };

    if (!Number.isFinite(this.settings.userDifficulty) || this.settings.userDifficulty <= 0) {
      this.settings.userDifficulty = DEFAULT_SETTINGS.userDifficulty;
    }

    if (!this.settings.highlightColor.trim()) {
      this.settings.highlightColor = DEFAULT_SETTINGS.highlightColor;
    }

    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("settings-change");
  }

  async importCustomDictionary(options: ImportOptions): Promise<ImportResult> {
    const result = this.dictionaryImporter.import(options);

    if (!result.snapshot) {
      new Notice("Dictionary import failed.");
      return result;
    }

    this.customDictionarySnapshot = result.snapshot;
    this.settings = {
      ...this.settings,
      dictionarySource: "built-in-custom"
    };

    await this.savePluginData();
    this.refreshDictionary();
    await this.reanalyzeActiveDocument("dictionary-change");
    new Notice(`Imported ${result.successCount} words into LexiNote.`);

    return result;
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
      await this.app.workspace.revealLeaf(sidebarLeaf);
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
      await this.app.workspace.revealLeaf(libraryLeaf);
    }
  }

  private hydratePluginData(
    rawData: Partial<LexiNotePluginData> | null
  ): LexiNotePluginData {
    const rawSettings =
      rawData?.settings && typeof rawData.settings === "object"
        ? rawData.settings
        : undefined;
    const hydratedSettings: LexiNoteSettings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings
    };

    if (!Number.isFinite(hydratedSettings.userDifficulty)) {
      hydratedSettings.userDifficulty = DEFAULT_SETTINGS.userDifficulty;
    }

    if (!hydratedSettings.highlightColor) {
      hydratedSettings.highlightColor = DEFAULT_SETTINGS.highlightColor;
    }

    hydratedSettings.dictionarySource = this.hydrateDictionarySource(
      hydratedSettings.dictionarySource
    );

    return {
      settings: hydratedSettings,
      favorites: this.hydrateFavorites(rawData?.favorites),
      customDictionarySnapshot: this.hydrateCustomDictionarySnapshot(
        rawData?.customDictionarySnapshot
      ),
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

  private hydrateDictionarySource(value: unknown): LexiNoteSettings["dictionarySource"] {
    if (value === "built-in") {
      return "built-in-only";
    }

    if (value === "custom") {
      return "built-in-custom";
    }

    if (
      value === "built-in-only" ||
      value === "custom-only" ||
      value === "built-in-custom"
    ) {
      return value;
    }

    return DEFAULT_SETTINGS.dictionarySource;
  }

  private hydrateCustomDictionarySnapshot(
    snapshot?: CustomDictionarySnapshot
  ): CustomDictionarySnapshot | undefined {
    if (!snapshot || !Array.isArray(snapshot.entries)) {
      return undefined;
    }

    return snapshot;
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
      window.clearTimeout(this.reanalyzeTimer);
    }

    this.reanalyzeTimer = window.setTimeout(() => {
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
      window.clearTimeout(this.reanalyzeTimer);
    }

    this.reanalyzeTimer = window.setTimeout(() => {
      const pendingAnalysis = this.pendingEditorAnalysis;
      this.pendingEditorAnalysis = undefined;

      if (pendingAnalysis) {
        this.reanalyzeEditorContent(pendingAnalysis.filePath, pendingAnalysis.text);
      }
    }, 300);
  }
}
