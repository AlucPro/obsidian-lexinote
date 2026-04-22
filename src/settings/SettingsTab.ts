import { Notice, PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
import type LexiNotePlugin from "../main";
import type { ImportOptions } from "../dictionary/DictionaryImporter";
import type { DictionarySourceMode } from "../types";

type ImportFormat = ImportOptions["format"];

export class LexiNoteSettingsTab extends PluginSettingTab {
  private importFile?: File;
  private importDictionaryName = "Custom dictionary";
  private importDifficulty = 8;
  private importStatusEl?: HTMLElement;

  constructor(app: App, private readonly plugin: LexiNotePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("LexiNote settings").setHeading();

    new Setting(containerEl)
      .setName("User difficulty")
      .setDesc("Words with a higher difficulty are highlighted.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.step = "1";
        text.setValue(String(this.plugin.settings.userDifficulty));
        text.onChange((value) => {
          const nextValue = Number(value);

          if (!Number.isFinite(nextValue) || nextValue <= 0) {
            new Notice("User difficulty must be a finite positive number.");
            return;
          }

          void this.plugin.updateSettings({
            userDifficulty: nextValue
          });
        });
      });

    new Setting(containerEl)
      .setName("Highlight color")
      .setDesc("Background color for difficult words.")
      .addText((text) => {
        text.inputEl.type = "color";
        text.setValue(this.plugin.settings.highlightColor);
        text.onChange((value) => {
          if (!value.trim()) {
            new Notice("Highlight color cannot be empty.");
            return;
          }

          void this.plugin.updateSettings({
            highlightColor: value
          });
        });
      });

    new Setting(containerEl)
      .setName("Dictionary source")
      .setDesc("Choose which dictionaries are active for analysis.")
      .addDropdown((dropdown) => {
        dropdown.addOption("built-in-only", "Built-in only");
        dropdown.addOption("custom-only", "Custom only");
        dropdown.addOption("built-in-custom", "Built-in + custom");
        dropdown.setValue(this.plugin.settings.dictionarySource);
        dropdown.onChange((value) => {
          void this.plugin.updateSettings({
            dictionarySource: value as DictionarySourceMode
          });
        });
      });

    new Setting(containerEl)
      .setName("Hide known words")
      .setDesc("Do not highlight favorite words marked as known.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.hideKnownWords);
        toggle.onChange((value) => {
          void this.plugin.updateSettings({
            hideKnownWords: value
          });
        });
      });

    this.renderImportSection(containerEl);
  }

  private renderImportSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Custom dictionary import").setHeading();

    new Setting(containerEl)
      .setName("Dictionary file")
      .setDesc("Choose a .json, .csv, or .txt dictionary file.")
      .then((setting) => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json,.csv,.txt";
        fileInput.addEventListener("change", () => {
          this.importFile = fileInput.files?.[0];
          this.setImportStatus(
            this.importFile ? `Selected: ${this.importFile.name}` : ""
          );
        });
        setting.controlEl.appendChild(fileInput);
      });

    new Setting(containerEl)
      .setName("Dictionary name")
      .setDesc("Shown in word metadata.")
      .addText((text) => {
        text.setValue(this.importDictionaryName);
        text.onChange((value) => {
          this.importDictionaryName = value;
        });
      });

    new Setting(containerEl)
      .setName("Dictionary difficulty")
      .setDesc("Imported words inherit this finite positive difficulty.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.step = "1";
        text.setValue(String(this.importDifficulty));
        text.onChange((value) => {
          this.importDifficulty = Number(value);
        });
      });

    new Setting(containerEl)
      .setName("Import dictionary")
      .setDesc("Import replaces the previous custom dictionary snapshot.")
      .addButton((button) => {
        button.setButtonText("Import");
        button.setCta();
        button.onClick(() => {
          void this.importSelectedDictionary();
        });
      });

    this.importStatusEl = containerEl.createEl("p", {
      cls: "lexinote-import-status"
    });

    if (this.plugin.customDictionarySnapshot) {
      this.setImportStatus(
        `Current custom dictionary: ${this.plugin.customDictionarySnapshot.dictionaryName} (${this.plugin.customDictionarySnapshot.entries.length} words)`
      );
    }
  }

  private async importSelectedDictionary(): Promise<void> {
    if (!this.importFile) {
      new Notice("Choose a dictionary file first.");
      return;
    }

    if (!this.importDictionaryName.trim()) {
      new Notice("Dictionary name is required.");
      return;
    }

    if (!Number.isFinite(this.importDifficulty) || this.importDifficulty <= 0) {
      new Notice("Dictionary difficulty must be a finite positive number.");
      return;
    }

    const format = this.getImportFormat(this.importFile.name);

    if (!format) {
      new Notice("Dictionary file must be .json, .csv, or .txt.");
      return;
    }

    const result = await this.plugin.importCustomDictionary({
      fileName: this.importFile.name,
      content: await this.importFile.text(),
      format,
      dictionaryName: this.importDictionaryName,
      difficulty: this.importDifficulty,
      importedAt: Date.now()
    });

    if (result.snapshot) {
      this.setImportStatus(
        `Imported ${result.successCount} words. Failed: ${result.failedCount}. Skipped: ${result.skippedCount}.`
      );
    } else {
      this.setImportStatus(
        `Import failed. ${result.errors.map((error) => error.message).join(" ")}`
      );
    }
  }

  private getImportFormat(fileName: string): ImportFormat | undefined {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (extension === "json" || extension === "csv" || extension === "txt") {
      return extension;
    }

    return undefined;
  }

  private setImportStatus(message: string): void {
    if (this.importStatusEl) {
      this.importStatusEl.textContent = message;
    }
  }
}
