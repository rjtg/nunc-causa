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
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else if (username && password && typeof btoa !== "undefined") {
        headers.set(
          "Authorization",
          `Basic ${btoa(`${username}:${password}`)}`,
        );
      }
      return fetch(input, { ...init, headers });
    },
  });
}
