const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function bytesToBase64Url(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  for (let i = 0; i < arr.length; i += 0x8000) {
    binary += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  let base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return atob(base64);
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return bytesToBase64Url(signature);
}

function getBearer(request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

export async function createSession(env) {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET belum dikonfigurasi.");
  }

  const payload = bytesToBase64Url(
    encoder.encode(
      JSON.stringify({
        exp: Date.now() + SESSION_TTL_SECONDS * 1000,
        nonce: crypto.randomUUID()
      })
    )
  );

  const signature = await hmac(env.SESSION_SECRET, payload);
  return `${payload}.${signature}`;
}

export async function validSession(request, env) {
  try {
    if (!env.SESSION_SECRET) return false;

    const token = getBearer(request);
    if (!token) return false;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expected = await hmac(env.SESSION_SECRET, payload);
    if (expected !== signature) return false;

    const decoded = JSON.parse(base64UrlDecode(payload));
    return Number(decoded.exp) > Date.now();
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
}

export function cookie() {
  return "";
}

export function clearCookie() {
  return "";
}

export function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
