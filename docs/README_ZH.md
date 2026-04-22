# LexiNote

![LexiNote 演示](asset/demo.gif)

[English](../README.md) | [中文](README_ZH.md)

在 Obsidian 写作时顺手学习词汇。

LexiNote 会根据你的词汇水平自动高亮英文难词，并在不打断写作流的前提下帮助你理解、收藏和管理这些词。

## 功能

- 实时高亮难词
- hover 查看释义
- 将单词加入个人词库
- 当前文档词表
- Vocabulary Library 搜索、排序、标熟和删除
- 内置基于 ECDICT 生成的 CET4 / CET6 词库
- JSON / CSV / TXT 自定义词库导入
- 为无本地释义的单词配置可选 fallback definition endpoint

## 环境要求

- Node.js 18 或更高版本
- npm
- Obsidian Desktop
- 一个用于本地测试的 Obsidian vault

## 状态

首个版本撰写完毕。核心本地功能已经可以进行手动测试。

## 开发

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

## 安装到本地 Vault

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

## 在 Obsidian 中启用

1. 在 Obsidian 中打开测试 vault。
2. 进入 `Settings -> Community plugins`。
3. 如有需要，关闭 Safe mode。
4. 刷新已安装插件列表。
5. 启用 `LexiNote`。

启用后，左侧 ribbon 应出现 LexiNote 的书本图标。

## 本地验收路径

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
- 行内代码、fenced code、URL 和 wikilink 会被排除。
- hover 高亮词时显示释义。
- LexiNote ribbon 图标会打开当前文档词表。
- 当前文档词表顶部有 `My Vocabulary` 按钮，用于打开 Vocabulary Library。

完整手动验收清单见 [docs/4_LOCAL_TESTING.md](4_LOCAL_TESTING.md)。

## 自定义词库导入

LexiNote 支持导入 `JSON`、`CSV`、`TXT` 三种自定义词库文件。导入后的词条会保存在本地 Obsidian 插件数据中。导入界面会要求填写词库名称和难度值，导入的每个单词都会继承这两个值。

自定义词库不限定释义语言。LexiNote 只要求 `word` 是英文单词，`meaning` 可以是中文、日语、韩语、法语或任何你想复习的目标语言。也就是说，只要换一份自定义词库，就可以支持「英文 -> 中文」「英文 -> 日语」等不同学习方向。

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

推荐使用 `word,meaning` 表头：

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

TXT 导入不包含本地释义，因此 hover 卡片和列表会显示 `暂无本地释义`，除非你启用了 fallback definition endpoint。

### 测试 Fixture

用于本地自定义词库导入测试的示例文件位于：

```text
tests/fixtures/imports/custom-academic.json
tests/fixtures/imports/custom-writing.csv
tests/fixtures/imports/custom-txt-words.txt
```

TXT 导入不包含本地释义，因此适合用于验证 fallback definition 流程。

## Fallback Endpoint Mock

启动本地 fallback definition mock：

```bash
node -e 'const http=require("http");const meanings={meticulous:"非常细致的；一丝不苟的",scrutiny:"仔细审查；认真检查",resilient:"有恢复力的；有韧性的"};http.createServer((req,res)=>{res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");if(req.method==="OPTIONS"){res.writeHead(204);return res.end();}if(req.method!=="POST"||req.url!=="/lookup"){res.writeHead(404);return res.end("not found");}let body="";req.on("data",c=>body+=c);req.on("end",()=>{const word=(JSON.parse(body||"{}").word||"").toLowerCase();res.setHeader("Content-Type","application/json");res.end(JSON.stringify({meaning:meanings[word]||`Mock definition for ${word}`}));});}).listen(8787,"127.0.0.1",()=>console.log("LexiNote fallback mock: http://127.0.0.1:8787/lookup"));'
```

然后在 LexiNote settings 中配置：

```text
Fallback API: on
Fallback endpoint: http://127.0.0.1:8787/lookup
Fallback API key: empty
```

fallback client 只会发送：

```json
{
  "word": "meticulous"
}
```

## Release

假设要发布 0.1.1 这个号到 github上。

```bash
gh release create 0.1.1 manifest.json main.js styles.css \
  --title "0.1.1" \
  --notes "Release 0.1.1"

```

## License

MIT
