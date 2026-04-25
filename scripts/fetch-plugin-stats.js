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
const end = new Date().toISOString();

const url = new URL(`https://${SITE}.goatcounter.com/api/v0/stats/hits`);
url.searchParams.set("start", start);
url.searchParams.set("end", end);
url.searchParams.set("limit", "100");

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});

if (!res.ok) {
  console.error(`GoatCounter API ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();

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
