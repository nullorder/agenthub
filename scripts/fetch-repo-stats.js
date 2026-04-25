#!/usr/bin/env node
// Fetch repo metadata for every GitHub-sourced plugin and write
// stats/repos.json. Runs in CI with GITHUB_TOKEN (5000 req/hr) so the site
// can render repo stats server-side instead of hammering the unauthenticated
// browser API (60 req/hr per IP, which exhausts fast behind a CDN).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN env var required");
  process.exit(1);
}

const marketplace = JSON.parse(
  readFileSync(resolve(REPO_ROOT, ".claude-plugin/marketplace.json"), "utf-8"),
);

function extractRepo(source) {
  if (!source || typeof source === "string") return "";
  if (source.source === "github") return source.repo || "";
  if (source.source === "url" || source.source === "git-subdir") {
    const m = (source.url || "").match(
      /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/,
    );
    return m ? m[1] : "";
  }
  return "";
}

const repos = new Set();
for (const p of marketplace.plugins || []) {
  const r = extractRepo(p.source);
  if (r) repos.add(r);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "agenthub-stats",
};

async function fetchRepo(repo) {
  const [repoRes, releaseRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers }),
  ]);

  if (!repoRes.ok) {
    return { error: `repo ${repoRes.status}` };
  }
  const data = await repoRes.json();

  let release = null;
  if (releaseRes.ok) {
    const r = await releaseRes.json();
    release = {
      tag: r.tag_name,
      url: r.html_url,
      published_at: r.published_at,
    };
  }

  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    watchers: data.subscribers_count ?? 0,
    issues: data.open_issues_count ?? 0,
    pushed_at: data.pushed_at,
    language: data.language ?? null,
    archived: Boolean(data.archived),
    release,
  };
}

const out = {};
const errors = [];
const sorted = [...repos].sort();

for (const repo of sorted) {
  try {
    const r = await fetchRepo(repo);
    if (r.error) {
      errors.push(`${repo}: ${r.error}`);
      continue;
    }
    out[repo] = r;
  } catch (e) {
    errors.push(`${repo}: ${e.message}`);
  }
}

const result = {
  generated_at: new Date().toISOString(),
  repos: out,
};

mkdirSync(resolve(REPO_ROOT, "stats"), { recursive: true });
writeFileSync(
  resolve(REPO_ROOT, "stats/repos.json"),
  JSON.stringify(result, null, 2) + "\n",
);

console.log(
  `Wrote stats/repos.json with ${Object.keys(out).length}/${sorted.length} repos.`,
);
if (errors.length) {
  console.error(`Skipped ${errors.length}:`);
  for (const e of errors) console.error(`  ${e}`);
}
