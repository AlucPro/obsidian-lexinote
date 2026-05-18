export interface MarkdownFileCandidate {
  extension: string;
}

export class ActiveMarkdownFileResolver<
  TFile extends MarkdownFileCandidate
> {
  private lastMarkdownFile?: TFile;

  resolve(activeFile: TFile | null | undefined): TFile | undefined {
    if (!activeFile) {
      return this.lastMarkdownFile;
    }

    if (activeFile.extension !== "md") {
      this.lastMarkdownFile = undefined;
      return undefined;
    }

    this.lastMarkdownFile = activeFile;
    return activeFile;
  }
}
