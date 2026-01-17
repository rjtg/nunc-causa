// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { usePopoverShift } from "./use-popover-shift";

const TestComponent = ({ openId }: { openId: string | null }) => {
  const shift = usePopoverShift(openId, "data-popover-anchor");
  return (
    <div>
      <div data-popover-anchor="popover" data-testid="anchor" />
      <span data-testid="shift">{shift}</span>
    </div>
  );
};

describe("usePopoverShift", () => {
  it("calculates shift when popover would overflow", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 100,
      configurable: true,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<TestComponent openId={null} />);
    });

    const anchor = container.querySelector('[data-popover-anchor="popover"]');
    if (anchor) {
      anchor.getBoundingClientRect = () =>
        ({ left: 20, right: 200, top: 0, bottom: 0, width: 180, height: 10 } as DOMRect);
    }

    act(() => {
      root.render(<TestComponent openId="popover" />);
    });

    const shift = container.querySelector('[data-testid="shift"]')?.textContent;
    expect(shift).toBe(String(100 - 12 - 200));
  });
});
