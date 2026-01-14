import createClient from "openapi-fetch";
import type { paths } from "./types";

type ClientOptions = {
  baseUrl: string;
  token?: string | null;
  username?: string | null;
  password?: string | null;
};

export function createApiClient({
  baseUrl,
  token,
  username,
  password,
}: ClientOptions) {
  return createClient<paths>({
    baseUrl,
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (username && password && typeof btoa !== "undefined") {
        headers.set(
          "Authorization",
          `Basic ${btoa(`${username}:${password}`)}`,
        );
      } else if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
  });
}
