const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function uploadStyleGuide(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/styleguide`, { method: "POST", body: form });
  return handle(res);
}

export async function getProfile() {
  const res = await fetch(`${BASE}/profile`);
  return handle(res);
}

export async function saveProfile(profile) {
  const res = await fetch(`${BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return handle(res);
}

export async function analyzeImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/analyze/image`, { method: "POST", body: form });
  return handle(res);
}

export async function analyzeText(text, assetName) {
  const res = await fetch(`${BASE}/analyze/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, asset_name: assetName }),
  });
  return handle(res);
}

export async function analyzeUrl(url) {
  const res = await fetch(`${BASE}/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handle(res);
}

export async function getHistory() {
  const res = await fetch(`${BASE}/history`);
  return handle(res);
}
