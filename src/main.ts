import { Notice, Plugin } from "obsidian";
import { Analyzer } from "./analysis/Analyzer";
import { DEFAULT_SETTINGS } from "./constants";
import { DictionaryService } from "./dictionary/DictionaryService";
import { AnalysisStore } from "./stores/AnalysisStore";
import { VocabularyStore } from "./stores/VocabularyStore";
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
  private reanalyzeTimer?: ReturnType<typeof window.setTimeout>;

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

    this.addRibbonIcon("book-open", "LexiNote", () => {
      void this.reanalyzeActiveDocument("startup");
    });

    this.addCommand({
      id: "reanalyze-active-document",
      name: "Reanalyze active document",
      callback: () => {
        void this.reanalyzeActiveDocument("active-file-change");
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
      this.app.workspace.on("editor-change", () => {
        this.queueReanalyzeActiveDocument("editor-change");
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

    if (reason === "startup" || reason === "active-file-change") {
      new Notice(`LexiNote found ${result.difficultWords.length} difficult words.`);
    }
  }

  registerViews(): void {
    // Sidebar and Vocabulary Library are implemented in later roadmap steps.
  }

  registerEditorIntegration(): void {
    // Editor highlighter and hover provider are implemented in later roadmap steps.
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
}
