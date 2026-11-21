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

  const res = await fetch(SIGNIN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Sign-in failed: ${res.status} ${res.statusText}`);
  }

  // The server returns the JWT itself as a JSON string: "eyJ..."
  const token = await res.json();

  return token;
}
