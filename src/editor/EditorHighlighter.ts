import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import type { App } from "obsidian";
import { MarkdownView } from "obsidian";
import type { DocumentAnalysisResult, LexiNoteSettings } from "../types";

interface HighlightPayload {
  result?: DocumentAnalysisResult;
  settings: LexiNoteSettings;
}

const setAnalysisEffect = StateEffect.define<HighlightPayload>();

function buildDecorations(
  result: DocumentAnalysisResult | undefined,
  settings: LexiNoteSettings
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  if (!result) {
    return Decoration.none;
  }

  const mark = Decoration.mark({
    attributes: {
      class: "lexinote-highlight",
      style: `--lexinote-highlight-color: ${settings.highlightColor};`
    }
  });

  const occurrences = result.difficultWords
    .reduce(
      (allOccurrences, word) => allOccurrences.concat(word.occurrences),
      [] as DocumentAnalysisResult["difficultWords"][number]["occurrences"]
    )
    .sort((left, right) => left.range.from - right.range.from);

  for (const occurrence of occurrences) {
    builder.add(occurrence.range.from, occurrence.range.to, mark);
  }

  return builder.finish();
}

export class EditorHighlighter {
  constructor(private readonly app: App) {}

  buildExtension(): Extension {
    return StateField.define<DecorationSet>({
      create() {
        return Decoration.none;
      },
      update(decorations, transaction) {
        let nextDecorations = decorations.map(transaction.changes);

        for (const effect of transaction.effects) {
          if (effect.is(setAnalysisEffect)) {
            nextDecorations = buildDecorations(effect.value.result, effect.value.settings);
          }
        }

        return nextDecorations;
      },
      provide(field) {
        return EditorView.decorations.from(field);
      }
    });
  }

  update(result: DocumentAnalysisResult | undefined, settings: LexiNoteSettings): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editorView = (activeView?.editor as unknown as { cm?: EditorView } | undefined)
      ?.cm;

    editorView?.dispatch({
      effects: setAnalysisEffect.of({
        result,
        settings
      })
    });
  }
}
