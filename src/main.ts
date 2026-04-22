import { Notice, Plugin } from "obsidian";

export default class LexiNotePlugin extends Plugin {
  async onload(): Promise<void> {
    this.addRibbonIcon("book-open", "LexiNote", () => {
      new Notice("LexiNote is loaded.");
    });

    this.addCommand({
      id: "open-lexinote",
      name: "Open LexiNote",
      callback: () => {
        new Notice("LexiNote MVP is in development.");
      }
    });
  }

  onunload(): void {
    // Obsidian disposes registered events, views, and commands automatically.
  }
}
