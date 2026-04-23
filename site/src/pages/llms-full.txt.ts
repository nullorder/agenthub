import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIContext } from "astro";
import {
  getSourceUrl,
  getSourceRepo,
  getSourceLabel,
  type PluginSource,
} from "../lib/source";

export const prerender = true;

interface Plugin {
  name: string;
  description: string;
  category: string;
  version?: string;
  license?: string;
  tags?: string[];
  author: { username: string; name?: string; url?: string };
  source: PluginSource;
}

function sanitize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function GET({ site }: APIContext) {
  const origin = (site ?? new URL("https://agenthub.nullorder.org"))
    .toString()
    .replace(/\/$/, "");

  const marketplacePath = resolve(
    process.cwd(),
    "../.claude-plugin/marketplace.json",
  );
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf-8"));
  const plugins: Plugin[] = marketplace.plugins || [];
  const authorCount = new Set(plugins.map((p) => p.author.username)).size;

  const sorted = [...plugins].sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  lines.push("# AgentHub — full plugin listing");
  lines.push("");
  lines.push(
    `> Complete listing of all ${plugins.length} Claude Code plugins in the AgentHub marketplace, from ${authorCount} authors. Machine-readable form for AI agents and search engines.`,
  );
  lines.push("");
  lines.push("## How to install any plugin below");
  lines.push("");
  lines.push("Run these commands inside Claude Code:");
  lines.push("");
  lines.push("```");
  lines.push("/plugin marketplace add nullorder/agenthub");
  lines.push("/plugin install <plugin-name>@agenthub");
  lines.push("```");
  lines.push("");
  lines.push(
    "The first command is a one-time setup; the second installs the plugin. Replace `<plugin-name>` with any `name` listed below.",
  );
  lines.push("");
  lines.push("## Plugins");
  lines.push("");

  for (const p of sorted) {
    const url = `${origin}/plugins/${p.name}/`;
    const sourceUrl = getSourceUrl(p.source);
    const sourceRepo = getSourceRepo(p.source);
    const sourceLabel = getSourceLabel(p.source);
    const authorDisplay = p.author.name || `@${p.author.username}`;
    const authorUrl =
      p.author.url ||
      (p.author.username
        ? `https://github.com/${p.author.username}`
        : "");

    lines.push(`### ${p.name}`);
    lines.push("");
    lines.push(sanitize(p.description));
    lines.push("");
    lines.push(`- Page: ${url}`);
    lines.push(`- Category: ${p.category}`);
    lines.push(`- Author: ${authorDisplay}${authorUrl ? ` (${authorUrl})` : ""}`);
    if (p.version) lines.push(`- Version: ${p.version}`);
    if (p.license) lines.push(`- License: ${p.license}`);
    if (p.tags && p.tags.length > 0) {
      lines.push(`- Tags: ${p.tags.join(", ")}`);
    }
    lines.push(`- Source type: ${sourceLabel}`);
    if (sourceUrl) lines.push(`- Source URL: ${sourceUrl}`);
    if (sourceRepo) lines.push(`- GitHub repo: ${sourceRepo}`);
    lines.push(`- Install: \`/plugin install ${p.name}@agenthub\``);
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
