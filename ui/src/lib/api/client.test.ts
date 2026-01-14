import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

describe("createApiClient", () => {
  it("adds content-type header for non-GET requests", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;

    try {
      const client = createApiClient({ baseUrl: "http://localhost:8080" });
      await client.POST("/issues", {
        body: {
          title: "test",
          ownerId: "dev",
          projectId: "project-alpha",
          phases: [],
        },
      });

      const init = fetchSpy.mock.calls[0]?.[1];
      const headers = new Headers(init?.headers);
      expect(headers.get("Content-Type")).toBe("application/json");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
