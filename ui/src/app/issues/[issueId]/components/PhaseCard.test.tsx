// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PhaseCard } from "./PhaseCard";
import type { IssueDetail } from "../types";

const issue: IssueDetail = {
  id: "ISSUE-1",
  title: "Issue",
  description: "desc",
  ownerId: "user-1",
  status: "IN_PROGRESS",
  phases: [],
};

const phase = {
  id: "phase-1",
  name: "Phase",
  status: "IN_PROGRESS",
  assigneeId: "user-1",
  tasks: [],
};

describe("PhaseCard", () => {
  it("renders children and status error", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <PhaseCard phase={phase} issue={issue} statusError="Oops">
          <p>Child content</p>
        </PhaseCard>,
      );
    });

    expect(container.textContent).toContain("Child content");
    expect(container.textContent).toContain("Oops");
    expect(container.querySelector("#phase-phase-1")).not.toBeNull();
  });
});
