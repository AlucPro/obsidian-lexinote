# LexiNote User Guide

[English](./en.md) | [中文](./zh-CN.md)

LexiNote is an Obsidian plugin for learning English vocabulary inside the notes you already write. It highlights difficult English words while you read, journal, draft essays, write blog posts, or take research notes, then shows quick meanings on hover and lets you save useful words into a lightweight personal vocabulary library.

The core idea is simple: vocabulary learning should stay close to real reading and writing. You do not need to open a separate study app or break your flow. LexiNote turns everyday notes into small, continuous learning moments inside your vault.

![LexiNote demo](../asset/demo.gif)

## Why LexiNote

- Discover, understand, save, and review vocabulary without leaving Obsidian.
- Works well for journals, reading notes, essays, blog drafts, research notes, and technical documentation.
- Highlights difficult words without changing your Markdown content.
- Includes built-in CET4 / CET6 dictionaries and supports multiple custom dictionaries.
- Lets you mark familiar words as known, so the plugin becomes quieter as you improve.
- Lets you export your vocabulary library as LexiNote JSON or Anki TSV.
- Follows the Obsidian app language for English and Chinese UI.
- Local-first by design: settings, favorites, and imported dictionaries live in your Obsidian plugin data.

## Installation

1. Open Obsidian.
2. Go to `Settings -> Community plugins`.
3. Turn off `Restricted mode` if Obsidian asks you to do so.
4. Click `Browse` to open the Community plugins marketplace.
5. Search for `LexiNote`.
6. Click `Install`.
7. After installation, click `Enable`.

After enabling LexiNote, a book icon appears in the left ribbon.

LexiNote requires Obsidian `1.8.7` or newer.

## Quick Start

1. Open an English Markdown note.
2. Write or paste a few English paragraphs.
3. LexiNote highlights words above your configured difficulty level.
4. Hover a highlighted word to see its local meaning and dictionary metadata.
5. Click the LexiNote book icon in the left ribbon to open the current document word list.
6. Click `Favorite` to save useful words into `My vocabulary`.
7. When a word becomes familiar, open your vocabulary library and click `Mark known` to mark it as known.

If Obsidian is set to Chinese, these labels are shown in Chinese. Other languages use English as the fallback.

You can also use these commands from the Obsidian command palette:

- `LexiNote: Reanalyze active document`
- `LexiNote: Open current document word list`
- `LexiNote: Open vocabulary library`

## Current Document Word List

Click the LexiNote ribbon icon, or run `LexiNote: Open current document word list`, to open the word list for the active note.

The list shows difficult words found in the current document, including:

- The word as it appears in your note.
- Local meaning.
- Dictionary entries and difficulty.
- A button to save or remove the word from your vocabulary library.

This view is useful after reading an article or finishing a writing session: you can quickly see which words appeared and decide which ones are worth keeping.

## Personal Vocabulary Library

Run `LexiNote: Open vocabulary library`, or click `My vocabulary` in the current document word list, to open your personal vocabulary library.

The library supports:

- Searching by word or meaning.
- Sorting newest first or oldest first.
- Sorting A-Z or Z-A.
- Marking words as known.
- Deleting words you no longer want to review.
- Exporting your saved words as LexiNote JSON.
- Exporting your saved words as Anki-compatible TSV.

If `Hide known words` is enabled, words marked as known will no longer be highlighted in your notes.

Export formats:

- `Export JSON` creates a LexiNote JSON dictionary. You can import it again from the custom dictionary importer.
- `Export Anki TSV` creates a UTF-8 tab-separated file with `word` and `meaning` columns. It is meant for Anki's standard text import flow and does not generate `.apkg` packages.

## Settings

Go to `Settings -> Community plugins -> LexiNote` to configure the plugin.

### User difficulty

LexiNote only highlights words with a difficulty higher than this value.

The default value is `3`. The built-in CET4 dictionary uses difficulty `4`, and CET6 uses difficulty `6`.

- Lower the value to see more highlights.
- Raise the value to reduce the number of highlights.

The value must be an integer from `1` to `30`. A larger number means a higher vocabulary level. The setting tooltip explains the rule: words with a dictionary difficulty higher than your user difficulty are treated as difficult.

### Highlight style

Choose how difficult words are marked in the editor:

- `Background`: uses the configured highlight color as a background.
- `Underline`: uses the configured highlight color as an underline.

When underline highlighting is enabled, choose either a straight underline or a wavy underline.

### Highlight color

Choose the color used for the highlight background or underline.

### Difficulty and dictionaries

LexiNote shows built-in and imported dictionaries in one dictionary table.

- Built-in CET4 / CET6 dictionaries are read-only.
- Imported dictionaries can be enabled, disabled, reordered, renamed, assigned a new difficulty, or deleted.
- The dictionary table order controls the display order when a word appears in multiple dictionaries.
- Dictionary names must be unique.

### Hide known words

When enabled, words marked as known in your vocabulary library will not be highlighted again.

### Custom dictionary import

LexiNote can import custom dictionaries from `JSON`, `CSV`, and `TXT` files.

During import, you provide:

- `Dictionary file`: the file to import.
- `Dictionary name`: shown in word metadata.
- `Dictionary difficulty`: the difficulty assigned to imported words.

Each import creates a new dictionary. If a dictionary with the same name already exists, LexiNote rejects the import and asks you to choose another name.

If the same word exists in multiple enabled dictionaries, LexiNote keeps every matching entry and shows them in dictionary order. A word is highlighted when at least one matching entry is above your user difficulty.

### Third-party dictionary repository

The settings page includes a third-party dictionary repository item. For now it is a simple description and link entry. Download dictionary files from that repository manually, then import them with the custom dictionary importer.

## Custom Dictionary Formats

### JSON

Use an array of objects. Each object should include `word` and may include `meaning`:

```json
[
  {
    "word": "meticulous",
    "meaning": "extremely careful and precise"
  },
  {
    "word": "resilient",
    "meaning": "able to recover or adapt quickly"
  }
]
```

### CSV

Use a `word,meaning` header:

```csv
word,meaning
nuance,a subtle difference
cohesive,well connected
elaborate,developed in detail
```

### TXT

Use one English word per line:

```text
meticulous
resilient
scrutiny
```

TXT imports do not include meanings, so hover cards and word lists show `No local meaning.` in English UI or `暂无本地释义` in Chinese UI.

## Duplicate Words And Favorites

When duplicate words appear in different enabled dictionaries, LexiNote does not merge them away. The current document word list and hover card can show multiple dictionary entries for the same word.

When you favorite a word, LexiNote saves a snapshot of the word, meaning, dictionary name, and difficulty. If you later delete the imported dictionary that originally contained the word, the favorite still remains in `My vocabulary` until you delete or unfavorite it.

## Privacy And Data

LexiNote is local-first:

- It does not modify your Markdown content.
- It analyzes the active note in your vault.
- Settings, favorite words, and custom dictionaries are saved in Obsidian plugin data.
- It does not require an account or a cloud service by default.
- It skips inline code, fenced code blocks, URLs, and Obsidian wikilink targets during analysis to reduce false positives.

## Troubleshooting

### I do not see any highlights

Check the following:

1. The active file is a Markdown document.
2. LexiNote is enabled.
3. The note contains words from the built-in or custom dictionaries.
4. `User difficulty` is not set too high.
5. The word has not been marked as known while `Hide known words` is enabled.
6. Run `LexiNote: Reanalyze active document` to reanalyze the current note.

### Some words have no meaning

If a word comes from a TXT import, or if your custom JSON / CSV dictionary does not include a `meaning` value, LexiNote shows `No local meaning.` in English UI or `暂无本地释义` in Chinese UI. Use JSON or CSV if you want meanings in hover cards and word lists.

### What should I put in a custom dictionary?

Good custom dictionaries usually come from words you actually meet, such as:

- Academic writing vocabulary.
- Technical documentation vocabulary.
- Professional domain terms.
- Exam vocabulary.
- Words collected from books, courses, or work materials.

## Contact The Author

If you like LexiNote, or if you are looking for someone who can turn developer tools, learning products, AI workflows, and knowledge management ideas into usable products, you can contact the author here:

[https://dg.aluc.me/](https://dg.aluc.me/)

## Repository

GitHub repository:

[https://github.com/AlucPro/obsidian-lexinote/](https://github.com/AlucPro/obsidian-lexinote/)

Issues, suggestions, and pull requests are welcome. Real usage stories are especially valuable because they help LexiNote grow closer to actual reading, writing, and learning workflows.
