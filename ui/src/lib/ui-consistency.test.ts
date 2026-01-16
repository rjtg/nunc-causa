import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const uiRoot = path.resolve(__dirname, "..");

function listTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listTsxFiles(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith(".tsx")) {
      return [fullPath];
    }
    return [];
  });
}

function findButtonBlocks(source: string): string[] {
  const blocks: string[] = [];
  const regex = /<button\b[\s\S]*?<\/button>/g;
  let match = regex.exec(source);
  while (match) {
    blocks.push(match[0]);
    match = regex.exec(source);
  }
  return blocks;
}

function findButtonLikeLinks(source: string): string[] {
  const blocks: string[] = [];
  const regex = /<Link\b[\s\S]*?<\/Link>/g;
  let match = regex.exec(source);
  while (match) {
    const block = match[0];
    if (block.includes("rounded-full")) {
      blocks.push(block);
    }
    match = regex.exec(source);
  }
  return blocks;
}

function extractClassName(block: string): string | null {
  const match = block.match(/className=\{?\"([^\"]+)\"/);
  return match ? match[1] : null;
}

describe("UI button icon consistency", () => {
  it("renders icons inside all buttons and button-like links", () => {
    const files = listTsxFiles(uiRoot).filter(
      (file) =>
        file.includes(`${path.sep}app${path.sep}`) ||
        file.includes(`${path.sep}components${path.sep}`),
    );
    const missingIcons: string[] = [];
    files.forEach((file) => {
      const source = fs.readFileSync(file, "utf8");
      findButtonBlocks(source).forEach((block) => {
        if (!block.includes("<Icon")) {
          missingIcons.push(`${file}:button`);
        }
      });
      findButtonLikeLinks(source).forEach((block) => {
        if (!block.includes("<Icon")) {
          missingIcons.push(`${file}:link`);
        }
      });
    });
    expect(missingIcons).toEqual([]);
  });
});

describe("UI read-tracking wiring", () => {
  it("uses comment read tracking endpoints and unread metadata", () => {
    const issuePage = path.join(uiRoot, "app", "issues", "[issueId]", "page.tsx");
    const source = fs.readFileSync(issuePage, "utf8");
    expect(source).toContain("/issues/{issueId}/comments/read");
    expect(source).toContain("unreadCount");
    expect(source).toContain("firstUnreadCommentId");
    expect(source).toContain("readByCount");
  });
});

describe("UI hover affordances", () => {
  it("adds hover styles on DateRangePicker buttons via className", () => {
    const files = listTsxFiles(uiRoot).filter((file) =>
      file.endsWith(`${path.sep}components${path.sep}date-range-picker.tsx`),
    );
    const missingHover: string[] = [];
    files.forEach((file) => {
      const source = fs.readFileSync(file, "utf8");
      findButtonBlocks(source).forEach((block) => {
        const className = extractClassName(block);
        if (!className) {
          return;
        }
        if (!className.includes("hover:")) {
          missingHover.push(`${file}:button`);
        }
      });
    });
    expect(missingHover).toEqual([]);
  });

  it("defines hover styles for buttons and button-like links", () => {
    const globals = path.join(uiRoot, "app", "globals.css");
    const source = fs.readFileSync(globals, "utf8");
    expect(source).toMatch(/button:not\(:disabled\):hover/);
    expect(source).toMatch(/a\.rounded-full:hover/);
    expect(source).toMatch(/filter:\s*brightness\(/);
  });
});
