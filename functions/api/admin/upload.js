import { validSession, unauthorized } from "../../_lib/auth.js";

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function safeExt(filename = "") {
  const raw = String(filename).split(".").pop() || "jpg";
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "jpg";
}

export async function onRequestPost({ request, env }) {
  if (!(await validSession(request, env))) {
    return unauthorized();
  }

  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return Response.json(
      { error: "Konfigurasi GitHub belum lengkap di Cloudflare." },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const type = String(form.get("type") || "media");

  if (!file || typeof file === "string") {
    return Response.json(
      { error: "File tidak ditemukan." },
      { status: 400 }
    );
  }

  if (!file.type || !file.type.startsWith("image/")) {
    return Response.json(
      { error: "Hanya file gambar yang diizinkan." },
      { status: 400 }
    );
  }

  const MAX_FILE_SIZE = 8 * 1024 * 1024;

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "Ukuran maksimal 8 MB per gambar." },
      { status: 400 }
    );
  }

  const ext = safeExt(file.name);
  const date = new Date();
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `uploads/${year}/${month}/${day}/${type}/${filename}`;

  const buffer = await file.arrayBuffer();
  const content = arrayBufferToBase64(buffer);

  const apiUrl =
    `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}` +
    `/${encodeURIComponent(env.GITHUB_REPO)}/contents/${path}`;

  const gh = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "member-winner-pages"
    },
    body: JSON.stringify({
      message: `Upload ${type}: ${filename}`,
      content,
      branch: "main"
    })
  });

  const result = await gh.json().catch(() => ({}));

  if (!gh.ok) {
    console.error("GitHub upload failed:", gh.status, result);

    let message = "Upload ke GitHub gagal.";

    if (gh.status === 401) {
      message = "GitHub token tidak valid atau sudah dicabut.";
    } else if (gh.status === 403) {
      message = "GitHub token tidak memiliki izin Contents: Read and write.";
    } else if (gh.status === 404) {
      message = "Repository GitHub tidak ditemukan atau token tidak punya akses.";
    } else if (result?.message) {
      message = `GitHub: ${result.message}`;
    }

    return Response.json(
      { error: message },
      { status: gh.status >= 500 ? 502 : 400 }
    );
  }

  const rawUrl =
    `https://raw.githubusercontent.com/${encodeURIComponent(env.GITHUB_OWNER)}` +
    `/${encodeURIComponent(env.GITHUB_REPO)}/main/${path}`;

  return Response.json({
    ok: true,
    path,
    url: rawUrl,
    sha: result?.content?.sha || null
  });
}
