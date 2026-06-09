import { getLanguage } from "obsidian";

export type LexiNoteLocale = "zh" | "en";

const enMessages = {
  actionDelete: "Delete",
  actionDown: "Down",
  actionImport: "Import",
  actionOpenRepository: "Open repository",
  actionReadOnly: "Read-only",
  actionUp: "Up",
  commandOpenCurrentDocumentWordList: "Open current document word list",
  commandOpenVocabularyLibrary: "Open vocabulary library",
  commandReanalyzeActiveDocument: "Reanalyze active document",
  dictionaryTypeBuiltIn: "Built-in",
  dictionaryTypeImported: "Imported",
  fallbackEndpointNotConfigured: "Fallback endpoint is not configured.",
  fallbackLookup: "Look up meaning",
  fallbackLookupFailed: "Lookup failed",
  fallbackLookupInProgress: "Looking up...",
  fallbackRemoteMeaning: "Remote meaning",
  libraryEmpty: "No favorite words yet.",
  libraryExportAnkiTsv: "Export Anki TSV",
  libraryExportJson: "Export JSON",
  libraryKnown: "Known",
  libraryMarkKnown: "Mark known",
  libraryNoMatches: "No matching favorite words.",
  libraryNotKnown: "Not known",
  librarySearchPlaceholder: "Search word or meaning",
  librarySortAZ: "A-Z",
  librarySortNewest: "Newest first",
  librarySortOldest: "Oldest first",
  librarySortZA: "Z-A",
  libraryUnmarkKnown: "Unmark known",
  noDifficultWordsFound: "No difficult words found.",
  noLocalMeaning: "No local meaning.",
  noMarkdownDocument: "No active Markdown document.",
  noticeChooseDictionaryFile: "Choose a dictionary file first.",
  noticeDictionaryDifficultyInvalid:
    "Dictionary difficulty must be an integer from 1 to 30.",
  noticeDictionaryFileInvalid: "Dictionary file must be JSON, CSV, or txt.",
  noticeDictionaryImportFailed: "Dictionary import failed.",
  noticeDictionaryNameExists: "Dictionary name already exists.",
  noticeDictionaryNameRequired: "Dictionary name is required.",
  noticeExportedFavorites: "Exported {count} favorite words.",
  noticeHighlightColorEmpty: "Highlight color cannot be empty.",
  noticeImportedWords: "Imported {count} words into LexiNote.",
  noticeLexiNoteFound: "LexiNote found {count} difficult words.",
  noticeUnableOpenLibrary: "Unable to open vocabulary library.",
  noticeUnableOpenSidebar: "Unable to open sidebar.",
  noticeUserDifficultyInvalid: "User difficulty must be an integer from 1 to 30.",
  settingsCustomDictionaryImport: "Custom dictionary import",
  settingsAdvanced: "Advanced",
  settingsDefaultDictionaryName: "Custom dictionary",
  settingsDictionaryDifficulty: "Dictionary difficulty",
  settingsDictionaryDifficultyDesc: "Imported words inherit this difficulty from 1 to 30.",
  settingsDictionaryFile: "Dictionary file",
  settingsDictionaryFileDesc: "Choose a JSON, CSV, or txt dictionary file.",
  settingsDictionaryName: "Dictionary name",
  settingsDictionaryNameDesc: "Shown in word metadata.",
  settingsDictionaryRepository: "Dictionary repository",
  settingsDictionaryRepositoryDesc:
    "Download dictionary files from the third-party repository, then import them with the dictionary importer above.",
  settingsDictionaryPathRules: "Dictionary path rules",
  settingsDictionaryPathRulesDesc:
    "Control where dictionary analysis is enabled by folder or file. Leave empty to enable all notes.",
  settingsDictionaryPathRuleEnabled: "Enabled path",
  settingsDictionaryPathRuleDisabled: "Disabled path",
  settingsDictionaryPathRulePathPlaceholder:
    "Example: English/Reading or English/reading.md",
  settingsAddDictionaryPathRule: "Add path rule",
  settingsDifficultyAndDictionaries: "Difficulty and dictionaries",
  settingsHideKnownWords: "Hide known words",
  settingsHideKnownWordsDesc: "Do not highlight favorite words marked as known.",
  settingsHighlightColor: "Highlight color",
  settingsHighlightColorDesc: "Color used for the highlight background or underline.",
  settingsHighlightStyle: "Highlight style",
  settingsHighlightStyleBackground: "Background",
  settingsHighlightStyleDesc: "Choose how difficult words are marked in the editor.",
  settingsHighlightStyleUnderline: "Underline",
  settingsHoverAutoPronunciation: "Auto-pronounce words on hover",
  settingsHoverAutoPronunciationDesc:
    "Automatically pronounce highlighted words when their hover card appears.",
  settingsImportDictionary: "Import dictionary",
  settingsImportDictionaryDesc: "Import adds a new dictionary to the dictionary table.",
  settingsImportFailed: "Import failed. {message}",
  settingsImportedDictionaries: "Imported dictionaries: {count}",
  settingsImportResult:
    "Imported {successCount} words; failed: {failedCount}; skipped: {skippedCount}.",
  settingsSelectedFile: "Selected: {fileName}",
  settingsTableActions: "Actions",
  settingsTableDifficulty: "Difficulty",
  settingsTableEnabled: "Enabled",
  settingsTableName: "Name",
  settingsTableOrder: "Order",
  settingsTableType: "Type",
  settingsTableWords: "Words",
  settingsThirdPartyDictionaryRepository: "Third-party dictionary repository",
  settingsUiDisplay: "UI display",
  settingsUnderlineStyle: "Underline style",
  settingsUnderlineStyleDesc: "Choose whether underline highlights are straight or wavy.",
  settingsUnderlineStyleSolid: "Straight",
  settingsUnderlineStyleWavy: "Wavy",
  settingsUserDifficulty: "User difficulty",
  settingsUserDifficultyDesc: "Words with a higher difficulty are highlighted.",
  settingsUserDifficultyTooltip:
    "This number represents your vocabulary level from 1 to 30. Words with a higher dictionary difficulty are treated as difficult and highlighted.",
  sidebarCurrentDifficultWords: "Current difficult words",
  sidebarFavoritedMeta: "Favorited",
  sidebarMyVocabulary: "My vocabulary",
  toggleFavoriteAdd: "Favorite",
  toggleFavoriteRemove: "Unfavorite",
  unknown: "Unknown",
  viewCurrentDocumentWordList: "Current document word list",
  viewVocabularyLibrary: "Vocabulary library"
} as const;

type MessageKey = keyof typeof enMessages;

const zhMessages: Partial<Record<MessageKey, string>> = {
  actionDelete: "删除",
  actionDown: "下移",
  actionImport: "导入",
  actionOpenRepository: "打开仓库",
  actionReadOnly: "只读",
  actionUp: "上移",
  commandOpenCurrentDocumentWordList: "打开当前文档词表",
  commandOpenVocabularyLibrary: "打开生词本",
  commandReanalyzeActiveDocument: "重新分析当前文档",
  dictionaryTypeBuiltIn: "内置",
  dictionaryTypeImported: "导入",
  fallbackEndpointNotConfigured: "未配置远程释义接口。",
  fallbackLookup: "查询释义",
  fallbackLookupFailed: "查询失败",
  fallbackLookupInProgress: "查询中...",
  fallbackRemoteMeaning: "远程释义",
  libraryEmpty: "还没有收藏单词。",
  libraryExportAnkiTsv: "导出 Anki TSV",
  libraryExportJson: "导出 JSON",
  libraryKnown: "已熟悉",
  libraryMarkKnown: "标熟",
  libraryNoMatches: "没有匹配的收藏单词。",
  libraryNotKnown: "未熟悉",
  librarySearchPlaceholder: "搜索单词或释义",
  librarySortAZ: "A-Z",
  librarySortNewest: "最新优先",
  librarySortOldest: "最早优先",
  librarySortZA: "Z-A",
  libraryUnmarkKnown: "取消熟悉",
  noDifficultWordsFound: "未发现难词。",
  noLocalMeaning: "暂无本地释义",
  noMarkdownDocument: "没有当前 Markdown 文档。",
  noticeChooseDictionaryFile: "请先选择词典文件。",
  noticeDictionaryDifficultyInvalid: "词典难度必须是 1 到 30 的整数。",
  noticeDictionaryFileInvalid: "词典文件必须是 JSON、CSV 或 txt。",
  noticeDictionaryImportFailed: "词典导入失败。",
  noticeDictionaryNameExists: "词典名称已存在。",
  noticeDictionaryNameRequired: "词典名称不能为空。",
  noticeExportedFavorites: "已导出 {count} 个收藏单词。",
  noticeHighlightColorEmpty: "高亮颜色不能为空。",
  noticeImportedWords: "已导入 {count} 个单词到 LexiNote。",
  noticeLexiNoteFound: "LexiNote 找到 {count} 个难词。",
  noticeUnableOpenLibrary: "无法打开生词本。",
  noticeUnableOpenSidebar: "无法打开侧边栏。",
  noticeUserDifficultyInvalid: "用户水平必须是 1 到 30 的整数。",
  settingsCustomDictionaryImport: "自定义词典导入",
  settingsAdvanced: "高级",
  settingsDefaultDictionaryName: "自定义词典",
  settingsDictionaryDifficulty: "词典难度",
  settingsDictionaryDifficultyDesc: "导入的单词会继承这个 1 到 30 的难度。",
  settingsDictionaryFile: "词典文件",
  settingsDictionaryFileDesc: "选择 JSON、CSV 或 txt 词典文件。",
  settingsDictionaryName: "词典名称",
  settingsDictionaryNameDesc: "显示在单词元信息中。",
  settingsDictionaryRepository: "词典仓库",
  settingsDictionaryRepositoryDesc: "从三方仓库下载词典文件后，可通过上方导入器导入。",
  settingsDictionaryPathRules: "词典生效/失效路径",
  settingsDictionaryPathRulesDesc:
    "按目录或文件控制词典分析是否生效。留空时全部笔记生效；存在生效路径时，只有命中的路径默认生效；失效路径可用于排除。",
  settingsDictionaryPathRuleEnabled: "生效路径",
  settingsDictionaryPathRuleDisabled: "失效路径",
  settingsDictionaryPathRulePathPlaceholder:
    "例如：English/Reading 或 English/reading.md",
  settingsAddDictionaryPathRule: "添加路径规则",
  settingsDifficultyAndDictionaries: "难度与词典",
  settingsHideKnownWords: "隐藏已熟悉单词",
  settingsHideKnownWordsDesc: "不再高亮生词本中标记为熟悉的单词。",
  settingsHighlightColor: "高亮颜色",
  settingsHighlightColorDesc: "用于背景高亮或下划线的颜色。",
  settingsHighlightStyle: "高亮样式",
  settingsHighlightStyleBackground: "背景色",
  settingsHighlightStyleDesc: "选择编辑器中难词的标记方式。",
  settingsHighlightStyleUnderline: "下划线",
  settingsHoverAutoPronunciation: "hover 单词自动朗读发音",
  settingsHoverAutoPronunciationDesc:
    "开启后，鼠标悬停到高亮单词并显示释义卡片时，会自动朗读该单词。",
  settingsImportDictionary: "导入词典",
  settingsImportDictionaryDesc: "导入后会在词典表中新增一本词典。",
  settingsImportFailed: "导入失败。{message}",
  settingsImportedDictionaries: "已导入词典：{count}",
  settingsImportResult:
    "已导入 {successCount} 个单词；失败：{failedCount}；跳过：{skippedCount}。",
  settingsSelectedFile: "已选择：{fileName}",
  settingsTableActions: "操作",
  settingsTableDifficulty: "难度",
  settingsTableEnabled: "启用",
  settingsTableName: "名称",
  settingsTableOrder: "顺序",
  settingsTableType: "类型",
  settingsTableWords: "词数",
  settingsThirdPartyDictionaryRepository: "三方词典仓库",
  settingsUiDisplay: "UI 展示",
  settingsUnderlineStyle: "下划线样式",
  settingsUnderlineStyleDesc: "选择直线下划线或波浪线下划线。",
  settingsUnderlineStyleSolid: "直线",
  settingsUnderlineStyleWavy: "波浪线",
  settingsUserDifficulty: "用户水平",
  settingsUserDifficultyDesc: "难度高于用户水平的单词会被高亮。",
  settingsUserDifficultyTooltip:
    "这个数字表示你的词汇水平，范围是 1 到 30。词典词条难度高于该数字时会被视为难词并高亮。",
  sidebarCurrentDifficultWords: "当前文档难词",
  sidebarFavoritedMeta: "已收藏",
  sidebarMyVocabulary: "生词本",
  toggleFavoriteAdd: "收藏",
  toggleFavoriteRemove: "取消收藏",
  unknown: "未知",
  viewCurrentDocumentWordList: "当前文档词表",
  viewVocabularyLibrary: "生词本"
};

export function getLexiNoteLocale(language = getLanguage()): LexiNoteLocale {
  return language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function translateMessage(
  key: string,
  language = getLanguage(),
  values: Record<string, string | number> = {}
): string {
  const locale = getLexiNoteLocale(language);
  const message =
    locale === "zh"
      ? zhMessages[key as MessageKey] ?? enMessages[key as MessageKey]
      : enMessages[key as MessageKey];
  const template = message ?? key;

  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = values[token];
    return value === undefined ? match : String(value);
  });
}

export function t(
  key: MessageKey,
  values: Record<string, string | number> = {}
): string {
  return translateMessage(key, getLanguage(), values);
}
