// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Typeahead } from "./typeahead";

describe("Typeahead", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = "";
  });

  it("selects text and opens on focus", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <Typeahead
          value="dev"
          onChange={vi.fn()}
          options={[{ value: "dev", label: "Dev User" }]}
          placeholder="Owner"
        />,
      );
    });

    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.focus();
    });

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("stops propagation so parent click handlers do not fire", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const parentClick = vi.fn();

    act(() => {
      root.render(
        <div onClick={parentClick}>
          <Typeahead
            value=""
            onChange={vi.fn()}
            options={[{ value: "dev", label: "Dev User" }]}
            placeholder="Owner"
          />
        </div>,
      );
    });

    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(parentClick).not.toHaveBeenCalled();
  });
});
