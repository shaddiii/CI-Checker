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

// Heavy endpoints (styleguide extraction, image/text/url checks) return a
// job_id immediately; the actual Claude call runs in a background thread on
// the server. We poll until it's done - this avoids ever hitting a request
// timeout on slow LLM responses, no matter how long they take.
async function pollJob(jobId, { intervalMs = 1500, timeoutMs = 180000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE}/jobs/${jobId}`);
    const body = await handle(res);
    if (body.status === "done") return body.result;
    if (body.status === "error") throw new Error(body.error || "Verarbeitung fehlgeschlagen.");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Zeitüberschreitung bei der Verarbeitung - bitte erneut versuchen.");
}

export async function uploadStyleGuide(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/styleguide`, { method: "POST", body: form });
  const { job_id } = await handle(res);
  return pollJob(job_id);
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
  const { job_id } = await handle(res);
  return pollJob(job_id);
}

export async function analyzeText(text, assetName) {
  const res = await fetch(`${BASE}/analyze/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, asset_name: assetName }),
  });
  const { job_id } = await handle(res);
  return pollJob(job_id);
}

export async function analyzeUrl(url) {
  const res = await fetch(`${BASE}/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const { job_id } = await handle(res);
  return pollJob(job_id);
}

export async function getHistory() {
  const res = await fetch(`${BASE}/history`);
  return handle(res);
}
