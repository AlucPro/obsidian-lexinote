# LexiNote 导入测试词库

这些文件用于测试 Settings Tab 中的自定义词库导入，属于测试 fixture，不是产品文档内容。

建议导入参数：

| 文件 | 词库名 | 难度 |
| --- | --- | --- |
| `custom-academic.json` | Academic Test | `8` |
| `custom-writing.csv` | Writing Test | `7` |
| `custom-txt-words.txt` | TXT Test | `8` |

导入后，在 Markdown 中输入对应单词并重新分析，应看到这些词以自定义词库难度高亮。

TXT 文件没有释义，hover 和列表中应显示“暂无本地释义”。
