// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { TaskDraftPanel, type TaskDraft } from "./TaskDraftPanel";
import type { IssueDetail } from "../types";

const issue: IssueDetail = {
  id: "ISSUE-1",
  title: "Issue",
  description: "desc",
  ownerId: "user-1",
  status: "IN_PROGRESS",
  phases: [],
};

const draft: TaskDraft = {
  title: "",
  assigneeId: "",
  startDate: "",
  dueDate: "",
  dependencies: [],
  saving: false,
  error: null,
};

describe("TaskDraftPanel", () => {
  it("submits on ctrl+enter and button click", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const onSubmit = vi.fn();

    act(() => {
      root.render(
        <TaskDraftPanel
          phaseId="phase-1"
          issue={issue}
          users={[]}
          draft={draft}
          datePopoverOpen={false}
          datePopoverShift={0}
          dependencyPopoverOpen={false}
          dependencyState={{ query: "", results: [], loading: false }}
          dependencyIssues={{}}
          dateWarning={null}
          onTitleChange={vi.fn()}
          onAssigneeChange={vi.fn()}
          onSubmit={onSubmit}
          onToggleDatePopover={vi.fn()}
          onCloseDatePopover={vi.fn()}
          onDateChange={vi.fn()}
          onClearDates={vi.fn()}
          onToggleDependencyPopover={vi.fn()}
          onSearchDependencies={vi.fn()}
          onAddDependency={vi.fn()}
          onRemoveDependency={vi.fn()}
          setDependencyState={vi.fn()}
          ensureIssueDetail={vi.fn().mockResolvedValue(null)}
          dependencyButtonClass="border-slate-200 bg-white text-slate-500"
          dependencyHref={vi.fn()}
          formatDependency={vi.fn().mockReturnValue({
            label: "dep",
            tooltip: "dep",
            style: "",
          })}
        />,
      );
    });

    const input = container.querySelector('input[placeholder="Task title"]');
    expect(input).not.toBeNull();

    act(() => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    const addButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Add"),
    );

    act(() => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
