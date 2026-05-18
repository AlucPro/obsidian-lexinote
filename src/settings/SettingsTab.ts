import { Notice, PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
import type LexiNotePlugin from "../main";
import type { ImportOptions } from "../dictionary/DictionaryImporter";
import type { HighlightStyle, UnderlineStyle } from "../types";
import { t } from "../i18n";

type ImportFormat = ImportOptions["format"];

export class LexiNoteSettingsTab extends PluginSettingTab {
  private importFile?: File;
  private importDictionaryName = t("settingsDefaultDictionaryName");
  private importDifficulty = 8;
  private importStatusEl?: HTMLElement;

  constructor(app: App, private readonly plugin: LexiNotePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t("settingsUiDisplay")).setHeading();

    new Setting(containerEl)
      .setName(t("settingsHighlightStyle"))
      .setDesc(t("settingsHighlightStyleDesc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("background", t("settingsHighlightStyleBackground"));
        dropdown.addOption("underline", t("settingsHighlightStyleUnderline"));
        dropdown.setValue(this.plugin.settings.highlightStyle);
        dropdown.onChange((value) => {
          void this.plugin.updateSettings({
            highlightStyle: value as HighlightStyle
          });
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t("settingsHighlightColor"))
      .setDesc(t("settingsHighlightColorDesc"))
      .addText((text) => {
        text.inputEl.type = "color";
        text.setValue(this.plugin.settings.highlightColor);
        text.onChange((value) => {
          if (!value.trim()) {
            new Notice(t("noticeHighlightColorEmpty"));
            return;
          }

          void this.plugin.updateSettings({
            highlightColor: value
          });
        });
      });

    if (this.plugin.settings.highlightStyle === "underline") {
      new Setting(containerEl)
        .setName(t("settingsUnderlineStyle"))
        .setDesc(t("settingsUnderlineStyleDesc"))
        .addDropdown((dropdown) => {
          dropdown.addOption("solid", t("settingsUnderlineStyleSolid"));
          dropdown.addOption("wavy", t("settingsUnderlineStyleWavy"));
          dropdown.setValue(this.plugin.settings.underlineStyle);
          dropdown.onChange((value) => {
            void this.plugin.updateSettings({
              underlineStyle: value as UnderlineStyle
            });
          });
        });
    }

    new Setting(containerEl)
      .setName(t("settingsHideKnownWords"))
      .setDesc(t("settingsHideKnownWordsDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.hideKnownWords);
        toggle.onChange((value) => {
          void this.plugin.updateSettings({
            hideKnownWords: value
          });
        });
      });

    new Setting(containerEl).setName(t("settingsDifficultyAndDictionaries")).setHeading();

    new Setting(containerEl)
      .setName(t("settingsUserDifficulty"))
      .setDesc(t("settingsUserDifficultyDesc"))
      .setTooltip(t("settingsUserDifficultyTooltip"))
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
            new Notice(t("noticeUserDifficultyInvalid"));
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
      t("settingsTableEnabled"),
      t("settingsTableName"),
      t("settingsTableType"),
      t("settingsTableDifficulty"),
      t("settingsTableWords"),
      t("settingsTableOrder"),
      t("settingsTableActions")
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
      typeCell.textContent =
        row.source === "built-in"
          ? t("dictionaryTypeBuiltIn")
          : t("dictionaryTypeImported");

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
            new Notice(t("noticeDictionaryDifficultyInvalid"));
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
      upButton.textContent = t("actionUp");
      upButton.disabled = row.order === 0;
      upButton.addEventListener("click", () => {
        void this.plugin.moveDictionary(row.id, -1).then(() => this.display());
      });
      const downButton = activeDocument.createElement("button");
      downButton.type = "button";
      downButton.textContent = t("actionDown");
      downButton.disabled = row.order === rows.length - 1;
      downButton.addEventListener("click", () => {
        void this.plugin.moveDictionary(row.id, 1).then(() => this.display());
      });
      orderCell.append(upButton, downButton);

      const actionsCell = activeDocument.createElement("td");
      if (row.readonly) {
        actionsCell.textContent = t("actionReadOnly");
      } else {
        const deleteButton = activeDocument.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = t("actionDelete");
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
    new Setting(containerEl).setName(t("settingsCustomDictionaryImport")).setHeading();

    new Setting(containerEl)
      .setName(t("settingsDictionaryFile"))
      .setDesc(t("settingsDictionaryFileDesc"))
      .then((setting) => {
        const fileInput = activeDocument.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json,.csv,.txt";
        fileInput.addEventListener("change", () => {
          this.importFile = fileInput.files?.[0];
          this.setImportStatus(
            this.importFile ? t("settingsSelectedFile", { fileName: this.importFile.name }) : ""
          );
        });
        setting.controlEl.appendChild(fileInput);
      });

    new Setting(containerEl)
      .setName(t("settingsDictionaryName"))
      .setDesc(t("settingsDictionaryNameDesc"))
      .addText((text) => {
        text.setValue(this.importDictionaryName);
        text.onChange((value) => {
          this.importDictionaryName = value;
        });
      });

    new Setting(containerEl)
      .setName(t("settingsDictionaryDifficulty"))
      .setDesc(t("settingsDictionaryDifficultyDesc"))
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
      .setName(t("settingsImportDictionary"))
      .setDesc(t("settingsImportDictionaryDesc"))
      .addButton((button) => {
        button.setButtonText(t("actionImport"));
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
        t("settingsImportedDictionaries", {
          count: this.plugin.customDictionarySnapshots.length
        })
      );
    }
  }

  private renderRepositorySection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settingsThirdPartyDictionaryRepository")).setHeading();

    new Setting(containerEl)
      .setName(t("settingsDictionaryRepository"))
      .setDesc(t("settingsDictionaryRepositoryDesc"))
      .addButton((button) => {
        button.setButtonText(t("actionOpenRepository"));
        button.onClick(() => {
          activeWindow.open("#", "_blank", "noopener");
        });
      });
  }

  private async importSelectedDictionary(): Promise<void> {
    if (!this.importFile) {
      new Notice(t("noticeChooseDictionaryFile"));
      return;
    }

    if (!this.importDictionaryName.trim()) {
      new Notice(t("noticeDictionaryNameRequired"));
      return;
    }

    if (
      !Number.isInteger(this.importDifficulty) ||
      this.importDifficulty < 1 ||
      this.importDifficulty > 30
    ) {
      new Notice(t("noticeDictionaryDifficultyInvalid"));
      return;
    }

    const format = this.getImportFormat(this.importFile.name);

    if (!format) {
      new Notice(t("noticeDictionaryFileInvalid"));
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
        t("settingsImportResult", {
          successCount: result.successCount,
          failedCount: result.failedCount,
          skippedCount: result.skippedCount
        })
      );
      this.importFile = undefined;
      this.display();
    } else {
      this.setImportStatus(
        t("settingsImportFailed", {
          message: result.errors.map((error) => error.message).join(" ")
        })
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
