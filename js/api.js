const SIGNIN_URL = "https://platform.zone01.gr/api/auth/signin";

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
    throw new Error("Could not reach the server. Check your connection and try again.");
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
