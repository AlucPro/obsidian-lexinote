import type { DocumentAnalysisResult } from "../types";

type AnalysisListener = (result?: DocumentAnalysisResult) => void;

export class AnalysisStore {
  private current?: DocumentAnalysisResult;
  private listeners = new Set<AnalysisListener>();

  getCurrent(): DocumentAnalysisResult | undefined {
    return this.current;
  }

  setCurrent(result?: DocumentAnalysisResult): void {
    this.current = result;
    this.notifyListeners();
  }

  subscribe(listener: AnalysisListener): () => void {
    this.listeners.add(listener);
    listener(this.current);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }
}
