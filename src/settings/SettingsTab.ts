import { Notice, PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
import type LexiNotePlugin from "../main";
import type { ImportOptions } from "../dictionary/DictionaryImporter";
import type { HighlightStyle, UnderlineStyle } from "../types";

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

    new Setting(containerEl).setName("UI display").setHeading();

    new Setting(containerEl)
      .setName("Highlight style")
      .setDesc("Choose how difficult words are marked in the editor.")
      .addDropdown((dropdown) => {
        dropdown.addOption("background", "Background");
        dropdown.addOption("underline", "Underline");
        dropdown.setValue(this.plugin.settings.highlightStyle);
        dropdown.onChange((value) => {
          void this.plugin.updateSettings({
            highlightStyle: value as HighlightStyle
          });
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Highlight color")
      .setDesc("Color used for the highlight background or underline.")
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

    if (this.plugin.settings.highlightStyle === "underline") {
      new Setting(containerEl)
        .setName("Underline style")
        .setDesc("Choose whether underline highlights are straight or wavy.")
        .addDropdown((dropdown) => {
          dropdown.addOption("solid", "Straight");
          dropdown.addOption("wavy", "Wavy");
          dropdown.setValue(this.plugin.settings.underlineStyle);
          dropdown.onChange((value) => {
            void this.plugin.updateSettings({
              underlineStyle: value as UnderlineStyle
            });
          });
        });
    }

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

    new Setting(containerEl).setName("Difficulty and dictionaries").setHeading();

    new Setting(containerEl)
      .setName("User difficulty")
      .setDesc("Words with a higher difficulty are highlighted.")
      .setTooltip(
        "This number represents your vocabulary level from 1 to 30. Words with a higher dictionary difficulty are treated as difficult and highlighted."
      )
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "30";
        text.inputEl.step = "1";
        text.setValue(String(this.plugin.settings.userDifficulty));
        text.onChange((value) => {
          const nextValue = Number(value);

          if (
            !Number.isInteger(nextValue) ||
            nextValue < 1 ||
            nextValue > 30
          ) {
            new Notice("User difficulty must be an integer from 1 to 30.");
            return;
          }

          void this.plugin.updateSettings({
            userDifficulty: nextValue
          });
        });
      });

    this.renderDictionaryTable(containerEl);

    this.renderImportSection(containerEl);
    this.renderRepositorySection(containerEl);
  }

  private renderDictionaryTable(containerEl: HTMLElement): void {
    const rows = this.plugin.getDictionaryRows();
    const wrapper = activeDocument.createElement("div");
    wrapper.classList.add("lexinote-dictionary-table-wrapper");

    const table = activeDocument.createElement("table");
    table.classList.add("lexinote-dictionary-table");

    const thead = activeDocument.createElement("thead");
    const headerRow = activeDocument.createElement("tr");

    for (const label of [
      "Enabled",
      "Name",
      "Type",
      "Difficulty",
      "Words",
      "Order",
      "Actions"
    ]) {
      const th = activeDocument.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = activeDocument.createElement("tbody");

    for (const row of rows) {
      const tr = activeDocument.createElement("tr");
      tr.dataset.dictionaryId = row.id;

      const enabledCell = activeDocument.createElement("td");
      const enabledInput = activeDocument.createElement("input");
      enabledInput.type = "checkbox";
      enabledInput.checked = row.enabled;
      enabledInput.addEventListener("change", () => {
        void this.plugin.setDictionaryEnabled(row.id, enabledInput.checked);
      });
      enabledCell.appendChild(enabledInput);

      const nameCell = activeDocument.createElement("td");
      if (row.readonly) {
        nameCell.textContent = row.name;
      } else {
        const nameInput = activeDocument.createElement("input");
        nameInput.type = "text";
        nameInput.value = row.name;
        nameInput.addEventListener("change", () => {
          void this.plugin.updateCustomDictionary(row.id, {
            dictionaryName: nameInput.value
          }).then((updated) => {
            if (updated) {
              this.display();
            }
          });
        });
        nameCell.appendChild(nameInput);
      }

      const typeCell = activeDocument.createElement("td");
      typeCell.textContent = row.source === "built-in" ? "Built-in" : "Imported";

      const difficultyCell = activeDocument.createElement("td");
      if (row.readonly) {
        difficultyCell.textContent = String(row.difficulty);
      } else {
        const difficultyInput = activeDocument.createElement("input");
        difficultyInput.type = "number";
        difficultyInput.min = "1";
        difficultyInput.max = "30";
        difficultyInput.step = "1";
        difficultyInput.value = String(row.difficulty);
        difficultyInput.addEventListener("change", () => {
          const nextDifficulty = Number(difficultyInput.value);

          if (
            !Number.isInteger(nextDifficulty) ||
            nextDifficulty < 1 ||
            nextDifficulty > 30
          ) {
            new Notice("Dictionary difficulty must be an integer from 1 to 30.");
            difficultyInput.value = String(row.difficulty);
            return;
          }

          void this.plugin.updateCustomDictionary(row.id, {
            difficulty: nextDifficulty
          });
        });
        difficultyCell.appendChild(difficultyInput);
      }

      const countCell = activeDocument.createElement("td");
      countCell.textContent = String(row.entryCount);

      const orderCell = activeDocument.createElement("td");
      const upButton = activeDocument.createElement("button");
      upButton.type = "button";
      upButton.textContent = "Up";
      upButton.disabled = row.order === 0;
      upButton.addEventListener("click", () => {
        void this.plugin.moveDictionary(row.id, -1).then(() => this.display());
      });
      const downButton = activeDocument.createElement("button");
      downButton.type = "button";
      downButton.textContent = "Down";
      downButton.disabled = row.order === rows.length - 1;
      downButton.addEventListener("click", () => {
        void this.plugin.moveDictionary(row.id, 1).then(() => this.display());
      });
      orderCell.append(upButton, downButton);

      const actionsCell = activeDocument.createElement("td");
      if (row.readonly) {
        actionsCell.textContent = "Read-only";
      } else {
        const deleteButton = activeDocument.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
          void this.plugin.removeCustomDictionary(row.id).then(() => this.display());
        });
        actionsCell.appendChild(deleteButton);
      }

      tr.append(
        enabledCell,
        nameCell,
        typeCell,
        difficultyCell,
        countCell,
        orderCell,
        actionsCell
      );
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    containerEl.appendChild(wrapper);
  }

  private renderImportSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Custom dictionary import").setHeading();

    new Setting(containerEl)
      .setName("Dictionary file")
      .setDesc("Choose a JSON, CSV, or txt dictionary file.")
      .then((setting) => {
        const fileInput = activeDocument.createElement("input");
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
      .setDesc("Imported words inherit this difficulty from 1 to 30.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "30";
        text.inputEl.step = "1";
        text.setValue(String(this.importDifficulty));
        text.onChange((value) => {
          this.importDifficulty = Number(value);
        });
      });

    new Setting(containerEl)
      .setName("Import dictionary")
      .setDesc("Import adds a new dictionary to the dictionary table.")
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

    if (this.plugin.customDictionarySnapshots.length > 0) {
      this.setImportStatus(
        `Imported dictionaries: ${this.plugin.customDictionarySnapshots.length}`
      );
    }
  }

  private renderRepositorySection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Third-party dictionary repository").setHeading();

    new Setting(containerEl)
      .setName("Dictionary repository")
      .setDesc("Download dictionary files from the third-party repository, then import them with the dictionary importer above.")
      .addButton((button) => {
        button.setButtonText("Open repository");
        button.onClick(() => {
          activeWindow.open("#", "_blank", "noopener");
        });
      });
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

    if (
      !Number.isInteger(this.importDifficulty) ||
      this.importDifficulty < 1 ||
      this.importDifficulty > 30
    ) {
      new Notice("Dictionary difficulty must be an integer from 1 to 30.");
      return;
    }

    const format = this.getImportFormat(this.importFile.name);

    if (!format) {
      new Notice("Dictionary file must be JSON, CSV, or txt.");
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
        `Imported ${result.successCount} words; failed: ${result.failedCount}; skipped: ${result.skippedCount}.`
      );
      this.importFile = undefined;
      this.display();
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
