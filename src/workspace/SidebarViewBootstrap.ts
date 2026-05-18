interface SidebarLeaf {
  setViewState(state: { type: string; active: boolean }): Promise<unknown>;
}

interface SidebarWorkspace {
  getLeavesOfType(type: string): unknown[];
  getRightLeaf(split: boolean): SidebarLeaf | null;
  onLayoutReady(callback: () => void): void;
}

export class SidebarViewBootstrap {
  constructor(
    private readonly workspace: SidebarWorkspace,
    private readonly viewTypes: string[]
  ) {}

  register(): void {
    this.workspace.onLayoutReady(() => {
      void this.ensureViews();
    });
  }

  async ensureViews(): Promise<void> {
    let createdAnyView = false;

    for (const viewType of this.viewTypes) {
      if (this.workspace.getLeavesOfType(viewType).length > 0) {
        continue;
      }

      const leaf = this.workspace.getRightLeaf(createdAnyView);
      if (!leaf) {
        continue;
      }

      await leaf.setViewState({
        type: viewType,
        active: false
      });
      createdAnyView = true;
    }
  }
}
