import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSourceRepo } from "./source";

const repoRoot = resolve(process.cwd(), "..");
const marketplacePath = resolve(repoRoot, ".claude-plugin/marketplace.json");
const statsPath = resolve(repoRoot, "stats/plugins.json");
const repoStatsPath = resolve(repoRoot, "stats/repos.json");

export type Plugin = Record<string, any> & {
  name: string;
  views: number;
  stars: number;
  addedAt: string | null;
  updatedAt: string | null;
};

export interface Author {
  username: string;
  name: string;
  url: string;
  plugins: Plugin[];
  views: number;
  stars: number;
}

export interface ActivityEvent {
  type: "added" | "updated" | "removed";
  plugin: string;
  date: string;
  from?: string;
  to?: string;
  author?: string;
}

function readJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function loadViewCounts(): Record<string, number> {
  return readJson(statsPath)?.plugins || {};
}

function loadRepoStats(): Record<string, { stars?: number; pushed_at?: string }> {
  return readJson(repoStatsPath)?.repos || {};
}

interface RegistryHistory {
  added: Record<string, string>;
  updated: Record<string, string>;
  events: ActivityEvent[];
}

let historyCache: RegistryHistory | null = null;

// Reads the git history of plugins/*.json once per build: when each plugin
// joined, when its entry last changed, and a feed of version bumps. Needs a
// full clone; a shallow checkout or missing git just yields an empty feed.
export function loadRegistryHistory(): RegistryHistory {
  if (historyCache) return historyCache;
  const history: RegistryHistory = { added: {}, updated: {}, events: [] };
  let log = "";
  try {
    log = execFileSync(
      "git",
      ["log", "-p", "--unified=0", "--no-renames", "--format=@@COMMIT %cI", "--", "plugins/"],
      { cwd: repoRoot, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    historyCache = history;
    return history;
  }

  let date = "";
  let file: { name: string; kind: ActivityEvent["type"]; from?: string; to?: string } | null = null;
  const flush = () => {
    if (!file || !date) return;
    const { name, kind, from, to } = file;
    // git log runs newest first, so the last "added" seen is the earliest.
    if (kind === "added") history.added[name] = date;
    history.updated[name] ??= date;
    if (kind !== "updated" || (to && from !== to)) {
      history.events.push({ type: kind, plugin: name, date, from, to });
    }
    file = null;
  };

  for (const line of log.split("\n")) {
    if (line.startsWith("@@COMMIT ")) {
      flush();
      date = line.slice(9).trim();
    } else if (line.startsWith("diff --git ")) {
      flush();
      const m = line.match(/ b\/plugins\/(.+)\.json$/);
      file = m ? { name: m[1], kind: "updated" } : null;
    } else if (file && line.startsWith("new file mode")) {
      file.kind = "added";
    } else if (file && line.startsWith("deleted file mode")) {
      file.kind = "removed";
    } else if (file) {
      const v = line.match(/^([+-])\s*"version":\s*"([^"]+)"/);
      if (v) v[1] === "+" ? (file.to = v[2]) : (file.from = v[2]);
    }
  }
  flush();

  historyCache = history;
  return history;
}

let pluginCache: Plugin[] | null = null;

export function loadPlugins(): Plugin[] {
  if (pluginCache) return pluginCache;
  const marketplace = readJson(marketplacePath) || {};
  const views = loadViewCounts();
  const repos = loadRepoStats();
  const history = loadRegistryHistory();

  const plugins: Plugin[] = (marketplace.plugins || []).map((p: any) => {
    const repo = repos[getSourceRepo(p.source)] || {};
    const registryUpdated = history.updated[p.name] || null;
    const pushed = repo.pushed_at || null;
    const updatedAt =
      registryUpdated && pushed
        ? registryUpdated > pushed ? registryUpdated : pushed
        : registryUpdated || pushed;
    return {
      ...p,
      views: views[p.name] ?? 0,
      stars: repo.stars ?? 0,
      addedAt: history.added[p.name] || null,
      updatedAt,
    };
  });

  pluginCache = plugins.sort(
    (a, b) => b.views - a.views || b.stars - a.stars || a.name.localeCompare(b.name),
  );
  return pluginCache;
}

export function loadAuthors(): Author[] {
  const byUser = new Map<string, Author>();
  for (const p of loadPlugins()) {
    const a = p.author || {};
    if (!a.username) continue;
    let author = byUser.get(a.username);
    if (!author) {
      author = {
        username: a.username,
        name: a.name || a.username,
        url: a.url || `https://github.com/${a.username}`,
        plugins: [],
        views: 0,
        stars: 0,
      };
      byUser.set(a.username, author);
    }
    author.plugins.push(p);
    author.views += p.views;
    // Several plugins can share one repo; count its stars once.
    if (!author.plugins.slice(0, -1).some((q) => getSourceRepo(q.source) && getSourceRepo(q.source) === getSourceRepo(p.source))) {
      author.stars += p.stars;
    }
  }
  return [...byUser.values()].sort(
    (a, b) => b.plugins.length - a.plugins.length || b.views - a.views || a.username.localeCompare(b.username),
  );
}

export function loadActivity(limit = 8): ActivityEvent[] {
  const authorOf = new Map(loadPlugins().map((p) => [p.name, p.author?.username]));
  return loadRegistryHistory()
    .events.slice(0, limit)
    .map((e) => ({ ...e, author: authorOf.get(e.plugin) }));
}
