#!/usr/bin/env node
// Check every plugin source for accessibility and open/update a GitHub issue
// listing any that return 404 or are otherwise unreachable. Designed to run
// weekly in CI so stale plugins are caught before users notice.
//
// For plugins on GitHub it also reads the repo tree and flags two kinds of
// drift: a git-subdir `path` that no longer exists, and a `skills` tag on a
// plugin that ships no SKILL.md where Claude Code looks for one. Apps that
// install skills from the catalogue filter on that tag, so a wrong one shows
// users plugins they cannot install anything from.

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN env var required");
  process.exit(1);
}

const GH_REPO = process.env.GITHUB_REPOSITORY; // owner/repo, set by Actions

const ghHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "agenthub-audit",
};

function extractGitHubRepo(source) {
  if (!source) return null;
  if (source.source === "github") return source.repo || null;
  // git-subdir and url sources all point at GitHub — extract owner/repo
  const url = source.url || "";
  const m = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?(?:\/|$)/);
  return m ? m[1] : null;
}

const pluginsDir = resolve(REPO_ROOT, "plugins");
const plugins = readdirSync(pluginsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const data = JSON.parse(readFileSync(resolve(pluginsDir, f), "utf-8"));
    return { file: f, ...data };
  });

async function checkGitHub(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: ghHeaders,
  });
  if (res.status === 404) return { ok: false, reason: "repo not found (404)" };
  if (res.status === 451)
    return { ok: false, reason: "unavailable for legal reasons (451)" };
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const data = await res.json();
  return { ok: true, archived: Boolean(data.archived) };
}

/** Every path in the repo at `at`, or null when the tree is too big to list. */
async function readTree(repo, at) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(at)}?recursive=1`,
    { headers: ghHeaders },
  );
  if (!res.ok) return { ok: false, reason: `tree at ${at}: HTTP ${res.status}` };
  const data = await res.json();
  if (data.truncated) return { ok: true, tree: null };
  return { ok: true, tree: data.tree };
}

async function readBlob(repo, sha) {
  const res = await fetch(`https://api.github.com/repos/${repo}/git/blobs/${sha}`, {
    headers: ghHeaders,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

const clean = (path) => (path || "").trim().replace(/^(\.\/)+/, "").replace(/^\/+|\/+$/g, "");

/**
 * Whether the plugin at `root` ships a skill, the way Claude Code finds one:
 * each place the manifest's `skills` field names, or `skills/` when it names
 * none, is either a skill folder itself or holds `<name>/SKILL.md`. A lone
 * SKILL.md at the plugin root also counts.
 */
async function hasSkills(repo, tree, root) {
  const prefix = root ? `${root}/` : "";
  const files = new Set(
    tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix)).map((e) => e.path.slice(prefix.length)),
  );

  let places = ["skills"];
  const manifest = tree.find((e) => e.path === `${prefix}.claude-plugin/plugin.json`);
  if (manifest) {
    try {
      const declared = JSON.parse((await readBlob(repo, manifest.sha)) ?? "{}").skills;
      const list = typeof declared === "string" ? [declared] : Array.isArray(declared) ? declared : [];
      const paths = list.filter((p) => typeof p === "string").map(clean);
      if (paths.length > 0) places = paths;
    } catch {
      // An unreadable manifest is Claude Code's problem to report; fall back to the default.
    }
  }

  for (const place of places) {
    const at = place ? `${place}/` : "";
    if (files.has(`${at}SKILL.md`)) return true;
    for (const file of files) {
      if (!file.startsWith(at)) continue;
      const rest = file.slice(at.length).split("/");
      if (rest.length === 2 && rest[1] === "SKILL.md") return true;
    }
  }
  return files.has("SKILL.md");
}

async function checkNpm(pkg) {
  const res = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(pkg)}`,
    { method: "HEAD" },
  );
  if (res.status === 404) return { ok: false, reason: "package not found (404)" };
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  return { ok: true };
}

const failures = [];
const archived = [];
const mistagged = [];

for (const plugin of plugins) {
  const { file, name, source } = plugin;

  let result;
  try {
    if (source?.source === "npm") {
      result = await checkNpm(source.package);
    } else {
      const repo = extractGitHubRepo(source);
      if (!repo) {
        failures.push({ file, name, reason: "could not resolve source repo" });
        continue;
      }
      result = await checkGitHub(repo);
      if (result.ok) {
        const at = source.sha || source.ref || "HEAD";
        const read = await readTree(repo, at);
        const root = source.source === "git-subdir" ? clean(source.path) : "";
        if (!read.ok) {
          result = { ok: false, reason: read.reason };
        } else if (read.tree) {
          if (root && !read.tree.some((e) => e.path.startsWith(`${root}/`))) {
            result = { ok: false, reason: `folder \`${root}\` not found in ${repo}` };
          } else if (plugin.tags?.includes("skills") && !(await hasSkills(repo, read.tree, root))) {
            mistagged.push({ file, name });
          }
        }
      }
    }
  } catch (e) {
    result = { ok: false, reason: e.message };
  }

  if (!result.ok) {
    failures.push({ file, name, reason: result.reason });
  } else if (result.archived) {
    archived.push({ file, name });
  }
}

console.log(
  `Audited ${plugins.length} plugins — ${failures.length} unreachable, ${archived.length} archived, ${mistagged.length} mistagged`,
);
for (const { file, reason } of failures) console.log(`  unreachable  ${file}: ${reason}`);
for (const { file } of mistagged) console.log(`  mistagged    ${file}: tagged skills, ships none`);

if (failures.length === 0 && archived.length === 0 && mistagged.length === 0) {
  console.log("All plugins OK.");
  process.exit(0);
}

// Build issue body
const date = new Date().toISOString().slice(0, 10);
let body = `Audited **${plugins.length} plugins** on ${date}.\n\n`;

if (failures.length > 0) {
  body += `### Unreachable (${failures.length})\n\n`;
  body += `These plugins should be removed — their source is gone or inaccessible:\n\n`;
  for (const { file, name, reason } of failures) {
    body += `- [ ] \`${file}\` (**${name}**) — ${reason}\n`;
  }
  body += "\n";
}

if (mistagged.length > 0) {
  body += `### Tagged \`skills\` but ship none (${mistagged.length})\n\n`;
  body += `No SKILL.md where Claude Code looks for one (\`skills/<name>/SKILL.md\`, or the paths in the manifest's \`skills\` field). Drop the \`skills\` tag or point the source at the right folder:\n\n`;
  for (const { file, name } of mistagged) {
    body += `- [ ] \`${file}\` (**${name}**)\n`;
  }
  body += "\n";
}

if (archived.length > 0) {
  body += `### Archived repos (${archived.length})\n\n`;
  body += `These plugins still exist but their source repo is archived. No action required unless you want to remove them.\n\n`;
  for (const { file, name } of archived) {
    body += `- \`${file}\` (**${name}**)\n`;
  }
  body += "\n";
}

body += `_Generated by the [weekly plugin audit](../../actions/workflows/plugin-audit.yml)._`;

const issueTitle = `Plugin audit (${date}): ${failures.length} unreachable, ${mistagged.length} mistagged`;

// Create or update the open audit issue
if (GH_REPO) {
  const [owner, repo] = GH_REPO.split("/");

  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=plugin-audit&per_page=1`,
    { headers: ghHeaders },
  );
  const existing = await listRes.json();

  if (existing.length > 0) {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${existing[0].number}`,
      {
        method: "PATCH",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ title: issueTitle, body }),
      },
    );
    console.log(`Updated issue #${existing[0].number}`);
  } else {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ title: issueTitle, body, labels: ["plugin-audit"] }),
      },
    );
    const issue = await res.json();
    console.log(`Created issue #${issue.number}`);
  }
}

if (failures.length > 0) process.exit(1);
