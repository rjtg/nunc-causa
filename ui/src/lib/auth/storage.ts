const tokenKey = "causa.token";
const baseUrlKey = "causa.baseUrl";
const usernameKey = "causa.username";
const passwordKey = "causa.password";

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

export function readUsername(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(usernameKey);
}

export function writeUsername(username: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (username) {
    window.localStorage.setItem(usernameKey, username);
  } else {
    window.localStorage.removeItem(usernameKey);
  }
}

export function readPassword(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(passwordKey);
}

export function writePassword(password: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (password) {
    window.localStorage.setItem(passwordKey, password);
  } else {
    window.localStorage.removeItem(passwordKey);
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
