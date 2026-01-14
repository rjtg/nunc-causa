import createClient from "openapi-fetch";
import type { paths } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const apiClient = createClient<paths>({
  baseUrl,
});
