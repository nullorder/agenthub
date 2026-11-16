#!/usr/bin/env node
// Fetch top plugin pageview counts from GoatCounter and write stats/plugins.json.
// Requires GOATCOUNTER_TOKEN in env. The /api/v0/stats/hits endpoint returns at
// most the top 100 paths by visitor count, so plugins outside the top 100 fall
// back to alphabetical sort on the site.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const SITE = process.env.GOATCOUNTER_SITE || "nullorder";
const TOKEN = process.env.GOATCOUNTER_TOKEN;
if (!TOKEN) {
  console.error("GOATCOUNTER_TOKEN env var required");
  process.exit(1);
}

const start = process.env.GOATCOUNTER_START || "2024-01-01T00:00:00Z";
// GoatCounter wants hour-aligned ranges, so round up to the next full hour.
const endDate = new Date();
endDate.setUTCHours(endDate.getUTCHours() + 1, 0, 0, 0);
const end = endDate.toISOString().replace(".000Z", "Z");

const url = new URL(`https://${SITE}.goatcounter.com/api/v0/stats/hits`);
url.searchParams.set("start", start);
url.searchParams.set("end", end);
url.searchParams.set("limit", "100");

// The API intermittently answers a valid, authenticated request with a 404,
// and the same request succeeds on a later try. Retry that, rate limits, 5xx
// and network errors; fail straight away on anything else (e.g. a bad token).
const RETRY_DELAYS_S = [10, 30, 90];
const isRetryable = (status) =>
  status === 404 || status === 408 || status === 429 || status >= 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};

// Asking for JSON makes GoatCounter return {"error": "..."} instead of an
// HTML error page, so the log says what actually went wrong.
async function errorMessage(res) {
  const body = await res.text();
  try {
    const json = JSON.parse(body);
    return json.error || JSON.stringify(json.errors ?? json);
  } catch {
    const h1 = body.match(/<h1>([^<]*)<\/h1>/i)?.[1];
    return h1 || body.replace(/\s+/g, " ").slice(0, 200);
  }
}

async function fetchHits() {
  const attempts = RETRY_DELAYS_S.length + 1;
  for (let attempt = 1; ; attempt++) {
    let res;
    let reason;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      reason = `network error: ${err.cause?.message || err.message}`;
    }

    if (res?.ok) return res.json();

    if (res) {
      reason = `${res.status} ${await errorMessage(res)}`;
      if (res.status === 401 || res.status === 403) {
        fail(`GoatCounter API ${reason}. Check the GOATCOUNTER_TOKEN secret.`);
      }
      if (!isRetryable(res.status)) fail(`GoatCounter API ${reason}`);
    }

    if (attempt === attempts) {
      fail(`GoatCounter API ${reason} (gave up after ${attempts} attempts)`);
    }

    const retryAfter = Number(res?.headers.get("Retry-After"));
    const wait = retryAfter > 0 ? Math.min(retryAfter, 120) : RETRY_DELAYS_S[attempt - 1];
    console.warn(
      `::warning::GoatCounter API ${reason}, retrying in ${wait}s (attempt ${attempt}/${attempts})`,
    );
    await sleep(wait * 1000);
  }
}

const data = await fetchHits();

const marketplace = JSON.parse(
  readFileSync(resolve(REPO_ROOT, ".claude-plugin/marketplace.json"), "utf-8"),
);
const knownPlugins = new Set(
  (marketplace.plugins || []).map((p) => p.name),
);

const counts = {};
for (const hit of data.hits || []) {
  const m = hit.path?.match(/^\/plugins\/([^/?#]+)\/?$/);
  if (!m) continue;
  const name = decodeURIComponent(m[1]);
  if (!knownPlugins.has(name)) continue;
  counts[name] = hit.count || 0;
}

const out = {
  generated_at: new Date().toISOString(),
  source: "goatcounter",
  range: { start, end },
  plugins: counts,
};

mkdirSync(resolve(REPO_ROOT, "stats"), { recursive: true });
writeFileSync(
  resolve(REPO_ROOT, "stats/plugins.json"),
  JSON.stringify(out, null, 2) + "\n",
);

console.log(
  `Wrote stats/plugins.json with counts for ${Object.keys(counts).length} plugins (out of ${data.hits?.length ?? 0} top paths returned).`,
);
