import { getToken } from "./auth.js";

const SIGNIN_URL = "https://platform.zone01.gr/api/auth/signin";
const GRAPHQL_URL = "https://platform.zone01.gr/api/graphql-engine/v1/graphql";

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";

// Thrown when the JWT is missing, invalid or expired -> the user must log in again.
export class AuthError extends Error {}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

export async function signin(identifier, password) {
  const credentials = toBase64(`${identifier}:${password}`);

  let res;
  try {
    res = await fetch(SIGNIN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
  } catch {
    // fetch only throws when there is no response at all (offline, DNS, server down)
    throw new Error(NETWORK_ERROR);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error("Invalid username/email or password.");
  }

  if (!res.ok) {
    throw new Error(`Something went wrong (error ${res.status}). Please try again.`);
  }

  // The server returns the JWT itself as a JSON string: "eyJ..."
  const token = await res.json();

  return token;
}

// Sends a GraphQL query with the user's JWT and returns the "data" part of the response.
export async function graphql(query, variables = {}) {
  const token = getToken();
  if (!token) {
    throw new AuthError("You are not logged in.");
  }

  let res;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthError("Your session has expired. Please sign in again.");
  }

  if (!res.ok) {
    throw new Error(`Something went wrong (error ${res.status}). Please try again.`);
  }

  const json = await res.json();

  // GraphQL errors usually come with status 200, so we must check the body too
  if (json.errors) {
    const isJwtError = json.errors.some(
      (err) => err.extensions?.code === "invalid-jwt" || err.message.includes("JWT")
    );
    if (isJwtError) {
      throw new AuthError("Your session has expired. Please sign in again.");
    }
    throw new Error(json.errors[0].message);
  }

  return json.data;
}
