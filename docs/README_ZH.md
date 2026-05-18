# LexiNote

[English](../README.md) | [用户使用手册](https://dg.aluc.me/Projects/OBSIDIAN-LEXINOTE/LexiNote-%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E) | [User Guide](https://dg.aluc.me/Projects/OBSIDIAN-LEXINOTE/LexiNote-User-Guide)

在你已经写下的笔记里学习英语词汇。

LexiNote 是一款 Obsidian 插件。它会在你阅读或写作时高亮英文难词，hover 时展示快速释义，并允许你把有用的单词保存到轻量的个人词库中。它的目标是尽量贴近你的写作流：不需要打开另一个背词软件，也不需要打断当前思路，只是在你的 vault 里自然地完成一点点词汇积累。

![LexiNote 演示](asset/demo.gif)

## 为什么使用 LexiNote

如果你经常在 Obsidian 里写英文日记、阅读笔记、文章草稿或博客，不熟悉的词往往正好出现在你的思路展开处。LexiNote 可以帮你发现这些词、快速理解它们，并把值得复习的词留下来。

它尤其适合：

- 把 Obsidian 当作英文阅读或写作工作区的英语学习者。
- 希望在当前笔记里获得词汇帮助、但不想频繁切换上下文的写作者。
- 需要 CET4 / CET6 难度提示和自定义词库的学习者。
- 多语言复习场景，例如「英文 -> 中文」或「英文 -> 日语」。

## 功能

- 在 Markdown 笔记中实时高亮英文难词。
- 支持背景色高亮和下划线高亮，下划线可选直线或波浪线。
- hover 高亮词时显示本地释义和词库信息。
- 当前文档词表会汇总当前笔记中的难词。
- 一键收藏单词到个人 Vocabulary Library。
- Vocabulary Library 支持搜索、排序、标熟、删除和导出。
- 内置基于 ECDICT 生成的 CET4 / CET6 词库。
- 支持从 `JSON`、`CSV`、`TXT` 导入多本自定义词库。
- 词典表支持启用、停用、排序、编辑导入词典和删除导入词典。
- 支持配置 `1` 到 `30` 的用户水平、高亮颜色和是否隐藏已熟悉单词。
- 生词本支持导出为 LexiNote JSON 或 Anki 可导入的 TSV。
- UI 文案支持中文和英文，并跟随 Obsidian 应用语言。
- 分析 Markdown 时会跳过行内代码、代码块、URL 和 wikilink。

## 环境要求

- Obsidian `1.8.7` 或更高版本。

## 从 Obsidian 社区插件市场安装

1. 打开 Obsidian。
2. 进入 `Settings -> Community plugins`。
3. 如果 Obsidian 提示，先关闭 `Restricted mode`。
4. 点击 `Browse` 打开社区插件市场。
5. 搜索 `LexiNote`。
6. 点击 `Install`。
7. 安装完成后点击 `Enable`。

启用后，Obsidian 左侧 ribbon 会出现 LexiNote 的书本图标。点击它可以打开当前文档词表。你也可以在命令面板中运行：

- `LexiNote: Reanalyze active document`
- `LexiNote: Open current document word list`
- `LexiNote: Open vocabulary library`

## 快速开始

1. 在 Obsidian 中打开一篇英文笔记。
2. 写入或粘贴几段英文内容。
3. LexiNote 会高亮超过当前难度设置的单词。
4. hover 高亮词，查看释义。
5. 点击左侧 LexiNote ribbon 图标，查看当前文档中的所有难词。
6. 将有用的单词保存到 `My vocabulary`。当你已经熟悉某个词时，可以把它标记为已熟悉，之后它就不会继续打扰你。

你可以在 `Settings -> Community plugins -> LexiNote` 中调整插件设置。

## 自定义词库导入

LexiNote 支持导入多本 `JSON`、`CSV`、`TXT` 自定义词库文件。导入后的词条会保存在本地 Obsidian 插件数据中。导入界面会要求填写词库名称和难度值，导入的每个单词都会继承这两个值。

自定义词库不限定释义语言。LexiNote 只要求 `word` 是英文单词，`meaning` 可以是中文、日语、韩语、法语或任何你想复习的目标语言。也就是说，同一个英文单词可以通过不同的 `meaning` 文本支持「英文 -> 中文」「英文 -> 日语」等不同学习方向。

导入词库会和内置 CET4 / CET6 一起显示在词典表中。内置词典只读，不能编辑或删除；导入词典可以启用、停用、调整顺序、改名、修改难度或删除。

词典名称不能重复。如果同一个单词出现在多本已启用词典中，LexiNote 会保留并展示多个词典条目，并按词典表顺序显示。只要任一命中词条的难度高于你的用户水平，这个单词就会被高亮。

### JSON

使用对象数组，每个对象包含 `word`，以及可选的 `meaning`：

```json
[
  {
    "word": "meticulous",
    "meaning": "非常细致的；一丝不苟的"
  },
  {
    "word": "resilient",
    "meaning": "回復力のある；しなやかな"
  }
]
```

### CSV

使用 `word,meaning` 表头：

```csv
word,meaning
nuance,细微差别
cohesive,まとまりのある；結束した
elaborate,详细说明；精心制作的
```

### TXT

每行一个英文单词：

```text
meticulous
resilient
scrutiny
```

TXT 导入不包含本地释义，因此 hover 卡片和列表会显示 `暂无本地释义`。

## 生词本导出

打开 `My vocabulary` 后可以使用：

- `导出 JSON`：导出 LexiNote JSON 词典文件，可通过自定义词典导入入口重新导入。
- `导出 Anki TSV`：导出 UTF-8 的 Tab 分隔文件，包含 `word` 和 `meaning` 两列，可在 Anki 中按 Tab 分隔字段导入。

Anki TSV 是最小可用格式，不生成 `.apkg`，也不包含卡片模板、发音、标签或 AnkiConnect 同步能力。

## 开发

### 环境要求

- Node.js 18 或更高版本
- npm
- Obsidian Desktop 1.8.7 或更高版本
- 一个用于本地测试的 Obsidian vault

### 命令

安装依赖：

```bash
npm install
```

运行单元测试：

```bash
npm test
```

运行类型检查：

```bash
npm run typecheck
```

构建插件：

```bash
npm run build
```

开发构建：

```bash
npm run dev
```

### 安装到本地 Vault

将 `/path/to/TestVault` 替换为你的本地 Obsidian vault 路径：

```bash
mkdir -p "/path/to/TestVault/.obsidian/plugins/lexinote"
cp manifest.json main.js styles.css "/path/to/TestVault/.obsidian/plugins/lexinote/"
```

插件目录应包含：

```text
/path/to/TestVault/.obsidian/plugins/lexinote/
  manifest.json
  main.js
  styles.css
```

### 在 Obsidian 中启用

1. 在 Obsidian 中打开测试 vault。
2. 进入 `Settings -> Community plugins`。
3. 如有需要，关闭 `Restricted mode`。
4. 刷新已安装插件列表。
5. 启用 `LexiNote`。

启用后，左侧 ribbon 应出现 LexiNote 的书本图标。

### 本地验收路径

使用下面这段内容快速验证 happy route：

````md
Today I encountered a peculiar problem.

This robust tool provides a comprehensive workflow.

`peculiar should not be highlighted inside inline code`

```text
robust should not be highlighted inside fenced code
```

Visit https://example.com/peculiar and check [[robust link target]].
````

预期行为：

- 普通正文中的 `peculiar`、`robust` 和 `comprehensive` 被高亮。
- 行内代码、代码块、URL 和 wikilink 会被排除。
- hover 高亮词时显示释义。
- LexiNote ribbon 图标会打开当前文档词表。
- 当前文档词表顶部有 `My vocabulary` 按钮，用于打开 Vocabulary Library。

### 测试 Fixture

用于本地自定义词库导入测试的示例文件位于：

```text
tests/fixtures/imports/custom-academic.json
tests/fixtures/imports/custom-writing.csv
tests/fixtures/imports/custom-txt-words.txt
tests/test-dictionary/v2-test-novel.md
tests/test-dictionary/v2-academic.json
tests/test-dictionary/v2-sensory.csv
tests/test-dictionary/v2-plain.txt
```

TXT 导入不包含本地释义，因此适合用于验证无本地释义的显示效果。

## Release

示例：发布 `0.1.5` 到 GitHub。

```bash
gh release create 0.1.5 main.js manifest.json styles.css -t "0.1.5"
```

## License

MIT
