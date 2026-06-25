const AUTH_TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEY = "token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY)
  );
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearSessionCookies(): void {
  if (typeof document === "undefined") {
    return;
  }
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Secure-next-auth.csrf-token",
  ];
  for (const name of cookieNames) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  clearSessionCookies();
}