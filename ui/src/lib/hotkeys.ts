"use client";

export function isHotkeyCandidate(event: KeyboardEvent): boolean {
  if (event.key !== "n") {
    return false;
  }
  const target = event.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return false;
  }
  return true;
}
