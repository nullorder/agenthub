import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIContext } from "astro";

export const prerender = true;

const TOP_LEVEL_PATHS = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/stats", priority: "0.6", changefreq: "weekly" },
  { path: "/coc", priority: "0.3", changefreq: "yearly" },
  { path: "/license", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
  const plugins: Array<{ name: string }> = marketplace.plugins || [];

  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    ...TOP_LEVEL_PATHS.map(({ path, priority, changefreq }) => ({
      loc: `${origin}${path}`,
      lastmod: today,
      changefreq,
      priority,
    })),
    ...plugins.map((p) => ({
      loc: `${origin}/plugins/${encodeURIComponent(p.name)}/`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${xmlEscape(u.loc)}</loc>\n` +
          `    <lastmod>${u.lastmod}</lastmod>\n` +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority}</priority>\n` +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
