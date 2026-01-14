import createClient from "openapi-fetch";
import type { paths } from "./types";

type ClientOptions = {
  baseUrl: string;
  token?: string | null;
};

export function createApiClient({ baseUrl, token }: ClientOptions) {
  return createClient<paths>({
    baseUrl,
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
  });
}
