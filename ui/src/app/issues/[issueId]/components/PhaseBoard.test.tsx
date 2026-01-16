// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { IssueDetail } from "../types";
import { PhaseBoard } from "./PhaseBoard";

describe("PhaseBoard", () => {
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
});
