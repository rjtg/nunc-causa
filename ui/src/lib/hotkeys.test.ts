import { describe, expect, it } from "vitest";
import { isHotkeyCandidate } from "./hotkeys";

describe("isHotkeyCandidate", () => {
  it("accepts bare n outside inputs", () => {
    const event = {
      key: "n",
      target: { tagName: "DIV", isContentEditable: false },
    } as KeyboardEvent;
    expect(isHotkeyCandidate(event)).toBe(true);
  });

  it("ignores n inside inputs", () => {
    const event = {
      key: "n",
      target: { tagName: "INPUT", isContentEditable: false },
    } as KeyboardEvent;
    expect(isHotkeyCandidate(event)).toBe(false);
  });

  it("ignores other keys", () => {
    const event = {
      key: "x",
      target: { tagName: "DIV", isContentEditable: false },
    } as KeyboardEvent;
    expect(isHotkeyCandidate(event)).toBe(false);
  });
});
