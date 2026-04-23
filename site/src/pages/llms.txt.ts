import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIContext } from "astro";

export const prerender = true;

interface Plugin {
  name: string;
  description: string;
  category: string;
  tags?: string[];
  author: { username: string; name?: string };
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

  const byCategory = new Map<string, Plugin[]>();
  for (const p of plugins) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  const categories = [...byCategory.keys()].sort();

  const lines: string[] = [];
  lines.push("# AgentHub");
  lines.push("");
  lines.push(
    `> A community-driven marketplace of ${plugins.length} Claude Code plugins from ${authorCount} authors. Install any listed plugin inside Claude Code with \`/plugin marketplace add nullorder/agenthub\` followed by \`/plugin install <name>@agenthub\`.`,
  );
  lines.push("");
  lines.push(
    "AgentHub is an open, community-curated index of plugins (skills, agents, slash commands, and hooks) that extend Anthropic's Claude Code CLI. Each plugin below links to its detail page, which documents the source repository, install command, author, license, and version.",
  );
  lines.push("");

  for (const category of categories) {
    const catPlugins = byCategory.get(category)!;
    catPlugins.sort((a, b) => a.name.localeCompare(b.name));
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    lines.push(`## ${label}`);
    lines.push("");
    for (const p of catPlugins) {
      const url = `${origin}/plugins/${p.name}/`;
      lines.push(`- [${p.name}](${url}): ${sanitize(p.description)}`);
    }
    lines.push("");
  }

  lines.push("## Optional");
  lines.push("");
  lines.push(
    `- [Full plugin listing](${origin}/llms-full.txt): every plugin with author, license, version, tags, source URL, and install command.`,
  );
  lines.push(
    `- [Marketplace JSON](${origin}/plugins.json): raw machine-readable plugin data.`,
  );
  lines.push(
    `- [Sitemap](${origin}/sitemap.xml): every indexable URL on the site.`,
  );
  lines.push(
    `- [Source repository](https://github.com/nullorder/agenthub): submit new plugins via pull request.`,
  );
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
