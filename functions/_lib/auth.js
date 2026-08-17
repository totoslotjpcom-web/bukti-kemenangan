function parseBasicAuth(request) {
  const header = request.headers.get("Authorization") || "";

  if (!header.toLowerCase().startsWith("basic ")) {
    return null;
  }

  try {
    const encoded = header.slice(6).trim();
    const decoded = atob(encoded);
    const sep = decoded.indexOf(":");

    if (sep < 0) return null;

    return {
      id: decoded.slice(0, sep),
      password: decoded.slice(sep + 1)
    };
  } catch {
    return null;
  }
}

export async function validSession(request, env) {
  if (!env.ADMIN_ID || !env.ADMIN_PASSWORD) {
    return false;
  }

  const credentials = parseBasicAuth(request);

  if (!credentials) {
    return false;
  }

  return (
    credentials.id === env.ADMIN_ID &&
    credentials.password === env.ADMIN_PASSWORD
  );
}

export async function createSession() {
  return "";
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
