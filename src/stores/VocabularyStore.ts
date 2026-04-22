import type { DictionaryEntry, FavoriteWord } from "../types";

export type VocabularySortMode =
  | "created-desc"
  | "created-asc"
  | "word-asc"
  | "word-desc";

type SaveCallback = () => void | Promise<void>;
type ChangeCallback = (favorites: Record<string, FavoriteWord>) => void;
type VocabularyListener = (favorites: Record<string, FavoriteWord>) => void;

export class VocabularyStore {
  private listeners = new Set<VocabularyListener>();

  constructor(
    private readonly favorites: Record<string, FavoriteWord>,
    private readonly saveCallback?: SaveCallback,
    private readonly changeCallback?: ChangeCallback,
    private readonly now: () => number = () => Date.now()
  ) {}

  getAll(): FavoriteWord[] {
    return Object.values(this.favorites);
  }

  get(normalizedWord: string): FavoriteWord | undefined {
    return this.favorites[this.normalizeKey(normalizedWord)];
  }

  subscribe(listener: VocabularyListener): () => void {
    this.listeners.add(listener);
    listener(this.favorites);

    return () => {
      this.listeners.delete(listener);
    };
  }

  add(entry: DictionaryEntry, displayWord?: string): FavoriteWord {
    const normalizedWord = this.normalizeKey(entry.normalizedWord || entry.word);
    const existingFavorite = this.favorites[normalizedWord];
    const timestamp = this.now();
    const favorite: FavoriteWord = {
      word: displayWord ?? existingFavorite?.word ?? entry.word,
      normalizedWord,
      meaning: entry.meaning,
      dictionaryName: entry.dictionaryName,
      difficulty: entry.difficulty,
      createdAt: existingFavorite?.createdAt ?? timestamp,
      updatedAt: timestamp,
      known: existingFavorite?.known ?? false
    };

    this.favorites[normalizedWord] = favorite;
    this.notifyChanged();

    return favorite;
  }

  remove(normalizedWord: string): void {
    const key = this.normalizeKey(normalizedWord);

    if (this.favorites[key]) {
      delete this.favorites[key];
      this.notifyChanged();
    }
  }

  toggleKnown(normalizedWord: string): FavoriteWord | undefined {
    const favorite = this.get(normalizedWord);

    if (!favorite) {
      return undefined;
    }

    favorite.known = !favorite.known;
    favorite.updatedAt = this.now();
    this.notifyChanged();

    return favorite;
  }

  search(query: string, sortMode: VocabularySortMode): FavoriteWord[] {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredFavorites = this.getAll().filter((favorite) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        favorite.word.toLowerCase().includes(normalizedQuery) ||
        favorite.normalizedWord.includes(normalizedQuery) ||
        (favorite.meaning?.toLowerCase().includes(normalizedQuery) ?? false)
      );
    });

    return this.sort(filteredFavorites, sortMode);
  }

  private sort(
    favorites: FavoriteWord[],
    sortMode: VocabularySortMode
  ): FavoriteWord[] {
    const sortedFavorites = [...favorites];

    sortedFavorites.sort((left, right) => {
      if (sortMode === "created-asc") {
        return left.createdAt - right.createdAt;
      }

      if (sortMode === "word-asc") {
        return left.normalizedWord.localeCompare(right.normalizedWord);
      }

      if (sortMode === "word-desc") {
        return right.normalizedWord.localeCompare(left.normalizedWord);
      }

      return right.createdAt - left.createdAt;
    });

    return sortedFavorites;
  }

  private normalizeKey(word: string): string {
    return word.toLowerCase();
  }

  private notifyChanged(): void {
    this.changeCallback?.(this.favorites);
    for (const listener of this.listeners) {
      listener(this.favorites);
    }
    void this.saveCallback?.();
  }
}
