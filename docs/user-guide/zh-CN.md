# LexiNote 使用说明

[English](./en.md) | [中文](./zh-CN.md)

LexiNote 是一款面向 Obsidian 用户的英语词汇学习插件。它会在你阅读、写日记、做读书笔记、写论文草稿或写英文博客时，自动高亮当前笔记里的英文难词，悬停即可查看释义，并把真正值得复习的词保存到你的个人词库里。

它的核心价值很简单：不把学习从写作里拆出去。你不需要打开另一个背单词软件，也不需要打断当前思路。LexiNote 把词汇积累放回你已经在使用的知识工作流中，让每一次阅读和写作都顺手变成一次轻量学习。

![LexiNote 演示](../asset/demo.gif)

## 为什么使用 LexiNote

- 在 Obsidian 内完成发现、理解、收藏和复习，不需要频繁切换应用。
- 适合英文日记、阅读摘录、论文笔记、博客草稿、技术文档阅读等真实场景。
- 高亮难词但不修改你的 Markdown 原文，保持笔记内容干净。
- 内置 CET4 / CET6 词库，也支持导入自己的专业词库。
- 支持把熟悉的单词标记为已掌握，减少重复打扰。
- 本地优先，词库、收藏和设置保存在你的 Obsidian 插件数据中。

## 安装

1. 打开 Obsidian。
2. 进入 `Settings -> Community plugins`。
3. 如果 Obsidian 提示，关闭 `Restricted mode`。
4. 点击 `Browse` 打开社区插件市场。
5. 搜索 `LexiNote`。
6. 点击 `Install`。
7. 安装完成后点击 `Enable`。

启用后，Obsidian 左侧 ribbon 会出现 LexiNote 的书本图标。

## 快速开始

1. 打开一篇英文 Markdown 笔记。
2. 写入或粘贴几段英文内容。
3. LexiNote 会自动高亮超过你当前难度设置的英文单词。
4. 将鼠标悬停在高亮单词上，查看本地释义和词库信息。
5. 点击左侧 LexiNote 书本图标，打开当前文档词表。
6. 在词表中点击 `收藏`，把有价值的单词保存到 `My vocabulary`。
7. 当你已经掌握某个词后，在个人词库中点击 `标熟`，之后它可以不再被高亮。

也可以通过 Obsidian 命令面板运行：

- `LexiNote: Reanalyze active document`
- `LexiNote: Open current document word list`
- `LexiNote: Open vocabulary library`

## 当前文档词表

点击左侧 ribbon 的 LexiNote 图标，或运行 `LexiNote: Open current document word list`，可以打开当前文档词表。

词表会展示当前笔记中识别出的难词，包括：

- 单词原文。
- 本地释义。
- 来源词库和难度。
- 收藏或取消收藏按钮。

这个视图适合在读完一篇文章或写完一段内容后快速回顾：哪些词出现过，哪些词值得留下来复习。

## 个人词库

运行 `LexiNote: Open vocabulary library`，或在当前文档词表中点击 `My vocabulary`，可以打开个人词库。

个人词库支持：

- 按单词或释义搜索。
- 按新旧顺序排序。
- 按 A-Z 或 Z-A 排序。
- 标记单词为已熟悉。
- 删除不想继续复习的单词。

如果开启 `Hide known words`，被标记为已熟悉的单词不会继续在笔记中高亮。这样 LexiNote 会随着你的学习进度变得越来越安静。

## 配置说明

进入 `Settings -> Community plugins -> LexiNote` 可以调整插件配置。

### User difficulty

用户难度阈值。LexiNote 只会高亮难度高于该数值的单词。

默认值是 `3`。内置 CET4 词库难度为 `4`，CET6 词库难度为 `6`。

- 想看到更多提示：调低数值。
- 想减少高亮数量：调高数值。

### Highlight color

高亮颜色。可以选择更适合你主题的颜色。

### Dictionary source

选择参与分析的词库来源：

- `Built-in only`：只使用内置词库。
- `Custom only`：只使用你导入的自定义词库。
- `Built-in + custom`：同时使用内置词库和自定义词库。

### Hide known words

开启后，个人词库中已标熟的单词不会继续高亮。

### Custom dictionary import

导入自定义词库。LexiNote 支持 `JSON`、`CSV` 和 `TXT` 文件。

导入时需要填写：

- `Dictionary file`：选择词库文件。
- `Dictionary name`：词库名称，会显示在单词元信息中。
- `Dictionary difficulty`：导入词条继承的难度值。

注意：当前导入会替换上一份自定义词库快照。如果你有多份词库，建议先合并后再导入。

## 自定义词库格式

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
    "meaning": "有恢复力的；适应力强的"
  }
]
```

### CSV

使用 `word,meaning` 表头：

```csv
word,meaning
nuance,细微差别
cohesive,连贯的；有凝聚力的
elaborate,详细说明；精心制作的
```

### TXT

每行一个英文单词：

```text
meticulous
resilient
scrutiny
```

TXT 不包含释义，因此悬停卡片和词表中会显示 `暂无本地释义`。

## 隐私与数据

LexiNote 采用本地优先设计：

- 不修改你的 Markdown 原文。
- 词汇分析基于当前打开的笔记内容。
- 设置、收藏词和自定义词库保存在 Obsidian 插件数据中。
- 默认不需要账号，也不依赖云端服务。
- 分析时会跳过行内代码、代码块、URL 和 Obsidian wikilink 目标，减少误判。

## 常见问题

### 为什么没有看到高亮？

可以依次检查：

1. 当前文件是否是 Markdown 文档。
2. 插件是否已经启用。
3. 笔记中是否包含内置词库或自定义词库里的单词。
4. `User difficulty` 是否设置得过高。
5. 目标单词是否已经在个人词库中被标记为已熟悉，并且开启了 `Hide known words`。
6. 运行 `LexiNote: Reanalyze active document` 重新分析当前文档。

### 为什么有些单词没有释义？

如果词条来自 TXT 导入，或自定义词库中没有提供 `meaning` 字段，LexiNote 会显示 `暂无本地释义`。建议使用 JSON 或 CSV 格式导入带释义的词库。

### 自定义词库适合放什么？

可以放你真正会遇到的词，例如：

- 学术写作词汇。
- 技术文档词汇。
- 专业领域术语。
- 考试词汇。
- 你从书籍、课程或工作资料中整理出来的高频词。

## 联系作者

如果你喜欢 LexiNote，或者你正在寻找能把开发工具、学习产品、AI 工作流、知识管理产品从想法落到可用产品的人，欢迎联系作者：

[https://dg.aluc.me/](https://dg.aluc.me/)

## 仓库链接

GitHub 仓库：

[https://github.com/AlucPro/obsidian-lexinote/](https://github.com/AlucPro/obsidian-lexinote/)

欢迎提交 issue、建议和 PR。也欢迎把你使用 LexiNote 的场景反馈给我，这会帮助它变成一个更贴近真实学习和写作场景的工具。
