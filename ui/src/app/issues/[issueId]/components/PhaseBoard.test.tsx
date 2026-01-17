// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { IssueDetail } from "../types";
import { PhaseBoard } from "./PhaseBoard";
import { Icon } from "@/components/icons";
import { IssueSummaryCard } from "@/components/issue-summary-card";

describe("PhaseBoard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });
  it("requests users when assignee picker opens", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const issue: IssueDetail = {
      id: "Beacon-7",
      title: "Beacon issue",
      description: "Needs attention",
      ownerId: "dev",
      status: "IN_PROGRESS",
      phases: [
        {
          id: "phase-1",
          name: "Investigation",
          status: "IN_PROGRESS",
          assigneeId: "dev",
          tasks: [
            {
              id: "task-1",
              title: "Triage",
              status: "IN_PROGRESS",
              assigneeId: "dev",
            },
          ],
        },
      ],
    };

    const api = {
      GET: vi.fn().mockResolvedValue({ data: null, error: null }),
      POST: vi.fn(),
      PATCH: vi.fn(),
    };

    const onRequestUsers = vi.fn();

    act(() => {
      root.render(
        <PhaseBoard
          issueId="Beacon-7"
          issue={issue}
          api={api as never}
          users={[{ id: "dev", displayName: "Dev User" }]}
          onIssueUpdate={vi.fn()}
          onRequestUsers={onRequestUsers}
        />,
      );
    });

    const button = container.querySelector(
      'button[aria-label="Change assignee"]',
    );
    expect(button).not.toBeNull();
    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onRequestUsers).toHaveBeenCalled();
  });

  it("renders dependency picker without missing user label", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const issue: IssueDetail = {
      id: "Beacon-7",
      title: "Beacon issue",
      description: "Needs attention",
      ownerId: "dev",
      status: "IN_PROGRESS",
      phases: [
        {
          id: "phase-1",
          name: "Investigation",
          status: "IN_PROGRESS",
          assigneeId: "dev",
          tasks: [],
        },
      ],
    };

    const api = {
      GET: vi.fn().mockResolvedValue({ data: null, error: null }),
      POST: vi.fn(),
      PATCH: vi.fn(),
    };

    act(() => {
      root.render(
        <PhaseBoard
          issueId="Beacon-7"
          issue={issue}
          api={api as never}
          users={[{ id: "dev", displayName: "Dev User" }]}
          onIssueUpdate={vi.fn()}
        />,
      );
    });

    const depButton = container.querySelector(
      'button[aria-label="Draft task dependencies"]',
    );
    expect(depButton).toBeTruthy();

    act(() => {
      depButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Dev User");
  });

  it("renders dependency tooltip segments without crashing", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const issue: IssueDetail = {
      id: "Beacon-7",
      title: "Beacon issue",
      description: "Needs attention",
      ownerId: "dev",
      status: "IN_PROGRESS",
      phases: [
        {
          id: "phase-1",
          name: "Investigation",
          status: "IN_PROGRESS",
          assigneeId: "dev",
          tasks: [
            {
              id: "task-1",
              title: "Triage",
              status: "IN_PROGRESS",
              assigneeId: "dev",
              dependencies: [{ type: "ISSUE", targetId: "Beacon-7" }],
            },
          ],
        },
      ],
    };

    const api = {
      GET: vi.fn().mockResolvedValue({ data: null, error: null }),
      POST: vi.fn(),
      PATCH: vi.fn(),
    };

    act(() => {
      root.render(
        <PhaseBoard
          issueId="Beacon-7"
          issue={issue}
          api={api as never}
          users={[{ id: "dev", displayName: "Dev User" }]}
          onIssueUpdate={vi.fn()}
        />,
      );
    });

    const depButton = container.querySelector(
      'button[aria-label="Task dependencies"]',
    );
    expect(depButton).toBeTruthy();

    act(() => {
      depButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Beacon issue");
  });

  it("closes date popovers on outside click", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const issue: IssueDetail = {
      id: "Beacon-7",
      title: "Beacon issue",
      description: "Needs attention",
      ownerId: "dev",
      status: "IN_PROGRESS",
      phases: [
        {
          id: "phase-1",
          name: "Investigation",
          status: "IN_PROGRESS",
          assigneeId: "dev",
          tasks: [
            {
              id: "task-1",
              title: "Triage",
              status: "IN_PROGRESS",
              assigneeId: "dev",
            },
          ],
        },
      ],
    };

    const api = {
      GET: vi.fn().mockResolvedValue({ data: null, error: null }),
      POST: vi.fn(),
      PATCH: vi.fn(),
    };

    act(() => {
      root.render(
        <PhaseBoard
          issueId="Beacon-7"
          issue={issue}
          api={api as never}
          users={[{ id: "dev", displayName: "Dev User" }]}
          onIssueUpdate={vi.fn()}
        />,
      );
    });

    const deadlineButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Deadline"),
    );
    expect(deadlineButton).toBeTruthy();
    act(() => {
      deadlineButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      container.querySelector('[data-phase-deadline-popover-content="phase-1"]'),
    ).toBeTruthy();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(
      container.querySelector('[data-phase-deadline-popover-content="phase-1"]'),
    ).toBeNull();

    const taskDateButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Dates"),
    );
    expect(taskDateButton).toBeTruthy();
    act(() => {
      taskDateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      container.querySelector('[data-task-date-popover-content="task-1"]'),
    ).toBeTruthy();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(
      container.querySelector('[data-task-date-popover-content="task-1"]'),
    ).toBeNull();
  });

  it("shifts date popovers to stay within the viewport", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const issue: IssueDetail = {
      id: "Beacon-7",
      title: "Beacon issue",
      description: "Needs attention",
      ownerId: "dev",
      status: "IN_PROGRESS",
      phases: [
        {
          id: "phase-1",
          name: "Investigation",
          status: "IN_PROGRESS",
          assigneeId: "dev",
          tasks: [],
        },
      ],
    };

    const api = {
      GET: vi.fn().mockResolvedValue({ data: null, error: null }),
      POST: vi.fn(),
      PATCH: vi.fn(),
    };

    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        x: -100,
        y: 0,
        width: 200,
        height: 100,
        top: 0,
        left: -100,
        right: 100,
        bottom: 100,
        toJSON: () => "",
      };
    };

    act(() => {
      root.render(
        <PhaseBoard
          issueId="Beacon-7"
          issue={issue}
          api={api as never}
          users={[{ id: "dev", displayName: "Dev User" }]}
          onIssueUpdate={vi.fn()}
        />,
      );
    });

    const deadlineButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Deadline"),
    );
    act(() => {
      deadlineButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const popover = container.querySelector(
      '[data-phase-deadline-popover-content="phase-1"]',
    ) as HTMLElement | null;
    expect(popover).toBeTruthy();
    expect(popover?.style.transform).toContain("calc(-50% + 112px)");

    HTMLElement.prototype.getBoundingClientRect = originalRect;
  });

  it("does not navigate when clicking in a no-link region", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <IssueSummaryCard
          id="BEACON-1"
          title="Beacon issue"
          href="/issues/BEACON-1"
          right={
            <div data-no-link>
              <button type="button">
                <Icon name="user" size={12} />
                Change owner
              </button>
            </div>
          }
        />,
      );
    });

    const anchor = container.querySelector('a[href="/issues/BEACON-1"]') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(clickEvent, "preventDefault");
    const button = container.querySelector("button");
    act(() => {
      button?.dispatchEvent(clickEvent);
    });

    expect(preventSpy).toHaveBeenCalled();
  });
});
