import { Notice, Plugin } from "obsidian";
import type { Editor, MarkdownFileInfo } from "obsidian";
import { Analyzer } from "./analysis/Analyzer";
import { DEFAULT_SETTINGS, SIDEBAR_VIEW_TYPE } from "./constants";
import { DictionaryService } from "./dictionary/DictionaryService";
import { EditorHighlighter } from "./editor/EditorHighlighter";
import { AnalysisStore } from "./stores/AnalysisStore";
import { VocabularyStore } from "./stores/VocabularyStore";
import { SidebarView } from "./views/SidebarView";
import type {
  CustomDictionarySnapshot,
  DictionaryEntry,
  FavoriteWord,
  LexiNotePluginData,
  LexiNoteSettings,
  RefreshReason
} from "./types";

export default class LexiNotePlugin extends Plugin {
  settings: LexiNoteSettings = { ...DEFAULT_SETTINGS };
  favorites: Record<string, FavoriteWord> = {};
  customDictionarySnapshot?: CustomDictionarySnapshot;
  dictionaryService: DictionaryService = new DictionaryService();
  vocabularyStore: VocabularyStore = new VocabularyStore(this.favorites);
  analysisStore: AnalysisStore = new AnalysisStore();
  analyzer: Analyzer = new Analyzer();
  highlighter?: EditorHighlighter;
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
    this.dictionaryService.loadBuiltIn(await this.loadBuiltInDictionaryFixtures());
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
    this.highlighter = new EditorHighlighter(this.app);

    this.addRibbonIcon("book-open", "LexiNote", () => {
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

    this.registerViews();
    this.registerEditorIntegration();

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

  async refreshDictionary(): Promise<void> {
    this.dictionaryService.setCustomSnapshot(this.customDictionarySnapshot);
    this.dictionaryService.rebuildEffectiveDictionary(this.settings);
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
  }

  registerEditorIntegration(): void {
    if (this.highlighter) {
      this.registerEditorExtension(this.highlighter.buildExtension());
    }
  }

  async activateSidebarView(): Promise<void> {
    const existingLeaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);

    if (existingLeaves.length === 0) {
      const leaf = this.app.workspace.getRightLeaf(false);

      if (!leaf) {
        new Notice("Unable to open LexiNote sidebar.");
        return;
      }

      await leaf.setViewState({
        type: SIDEBAR_VIEW_TYPE,
        active: true
      });
    }

    const sidebarLeaf = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE)[0];

    if (sidebarLeaf) {
      this.app.workspace.revealLeaf(sidebarLeaf);
    }

    await this.reanalyzeActiveDocument("active-file-change");
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

    if (!["built-in", "custom"].includes(hydratedSettings.dictionarySource)) {
      hydratedSettings.dictionarySource = DEFAULT_SETTINGS.dictionarySource;
    }

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

  private hydrateCustomDictionarySnapshot(
    snapshot?: CustomDictionarySnapshot
  ): CustomDictionarySnapshot | undefined {
    if (!snapshot || !Array.isArray(snapshot.entries)) {
      return undefined;
    }

    return snapshot;
  }

  private async loadBuiltInDictionaryFixtures(): Promise<DictionaryEntry[]> {
    const [cet4Entries, cet6Entries] = await Promise.all([
      this.loadDictionaryResource("resources/dictionaries/cet4.json"),
      this.loadDictionaryResource("resources/dictionaries/cet6.json")
    ]);

    return [...cet4Entries, ...cet6Entries];
  }

  private async loadDictionaryResource(path: string): Promise<DictionaryEntry[]> {
    const pluginDirectory = this.manifest.dir;
    const resourcePath = pluginDirectory ? `${pluginDirectory}/${path}` : path;
    const content = await this.app.vault.adapter.read(resourcePath);
    const parsedContent: unknown = JSON.parse(content);

    if (!Array.isArray(parsedContent)) {
      throw new Error(`Dictionary resource must be an array: ${path}`);
    }

    return parsedContent.filter(this.isDictionaryEntry);
  }

  private isDictionaryEntry(entry: unknown): entry is DictionaryEntry {
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
