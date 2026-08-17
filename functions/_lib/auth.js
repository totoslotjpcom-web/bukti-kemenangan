const encoder = new TextEncoder();
const COOKIE_NAME = "__Host-admin_session";
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

function base64UrlToString(value) {
  let base64 = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (base64.length % 4) {
    base64 += "=";
  }

  return atob(base64);
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(secret, payload) {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return bytesToBase64Url(signature);
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const cookies = header.split(";");

  for (const item of cookies) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) {
      return rest.join("=");
    }
  }

  return null;
}

export async function createSession(env) {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET belum dikonfigurasi.");
  }

  const payloadObject = {
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomUUID()
  };

  const payload = bytesToBase64Url(
    encoder.encode(JSON.stringify(payloadObject))
  );

  const signature = await sign(env.SESSION_SECRET, payload);

  return `${payload}.${signature}`;
}

export async function validSession(request, env) {
  try {
    if (!env.SESSION_SECRET) return false;

    const token = getCookie(request, COOKIE_NAME);
    if (!token) return false;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expected = await sign(env.SESSION_SECRET, payload);
    if (expected !== signature) return false;

    const decoded = JSON.parse(base64UrlToString(payload));

    return Number(decoded.exp) > Date.now();
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
}

export function cookie(token) {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`
  ].join("; ");
}

export function clearCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}

export function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
