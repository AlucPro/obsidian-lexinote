import { describe, expect, it, vi } from "vitest";
import { SidebarViewBootstrap } from "../src/workspace/SidebarViewBootstrap";

type CreatedLeaf = {
  split: boolean;
  setViewState: ReturnType<typeof vi.fn<[state: { type: string }], Promise<void>>>;
};

function createWorkspace(existingTypes: string[] = []) {
  const leavesByType = new Map<string, unknown[]>();
  for (const type of existingTypes) {
    leavesByType.set(type, [{}]);
  }

  const createdLeaves: CreatedLeaf[] = [];

  return {
    createdLeaves,
    workspace: {
      getLeavesOfType(type: string) {
        return leavesByType.get(type) ?? [];
      },
      getRightLeaf(split: boolean) {
        const leaf: CreatedLeaf = {
          split,
          setViewState: vi.fn(async (state: { type: string }) => {
            leavesByType.set(state.type, [{}]);
          })
        };
        createdLeaves.push(leaf);
        return leaf;
      },
      onLayoutReady(callback: () => void) {
        callback();
      }
    }
  };
}

describe("SidebarViewBootstrap", () => {
  it("creates missing right-sidebar view tabs", async () => {
    const { workspace, createdLeaves } = createWorkspace();
    const bootstrap = new SidebarViewBootstrap(workspace, [
      "lexinote-current-document",
      "lexinote-vocabulary-library"
    ]);

    await bootstrap.ensureViews();

    expect(createdLeaves).toHaveLength(2);
    expect(createdLeaves[0].split).toBe(false);
    expect(createdLeaves[1].split).toBe(true);
    expect(createdLeaves[0].setViewState).toHaveBeenCalledWith({
      type: "lexinote-current-document",
      active: false
    });
    expect(createdLeaves[1].setViewState).toHaveBeenCalledWith({
      type: "lexinote-vocabulary-library",
      active: false
    });
  });

  it("does not duplicate existing view tabs", async () => {
    const { workspace, createdLeaves } = createWorkspace([
      "lexinote-current-document"
    ]);
    const bootstrap = new SidebarViewBootstrap(workspace, [
      "lexinote-current-document",
      "lexinote-vocabulary-library"
    ]);

    await bootstrap.ensureViews();

    expect(createdLeaves).toHaveLength(1);
    expect(createdLeaves[0].setViewState).toHaveBeenCalledWith({
      type: "lexinote-vocabulary-library",
      active: false
    });
  });
});
