const tokenKey = "causa.token";
const baseUrlKey = "causa.baseUrl";

export function readToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(tokenKey);
}

export function writeToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(tokenKey, token);
  } else {
    window.localStorage.removeItem(tokenKey);
  }
}

export function readBaseUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(baseUrlKey);
}

export function writeBaseUrl(url: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (url) {
    window.localStorage.setItem(baseUrlKey, url);
  } else {
    window.localStorage.removeItem(baseUrlKey);
  }
}
