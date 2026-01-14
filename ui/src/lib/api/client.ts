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
      const request = input instanceof Request ? input : undefined;
      const headers = new Headers(request?.headers);
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers.set(key, value);
        });
      }
      const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
      if (method !== "GET" && !headers.has("Content-Type")) {
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
