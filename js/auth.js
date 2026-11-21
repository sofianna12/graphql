// Everything related to the JWT: storing it and reading what is inside it.

const TOKEN_KEY = "jwt";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// A JWT is "header.payload.signature". The payload is base64url-encoded JSON.
export function decodeToken(token) {
  let payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  while (payload.length % 4) payload += "=";
  // atob gives raw bytes; TextDecoder turns them into UTF-8 text (opposite of toBase64)
  const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// True only if the token exists, can be decoded and has not expired yet.
export function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = decodeToken(token);
    // exp is in seconds, Date.now() is in milliseconds
    return typeof exp === "number" && exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// The id of the logged-in user (needed later for the GraphQL queries).
export function getUserId(token) {
  return Number(decodeToken(token).sub);
}
