import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const marketplacePath = resolve(
  process.cwd(),
  "../.claude-plugin/marketplace.json",
);
const statsPath = resolve(process.cwd(), "../stats/plugins.json");

export type Plugin = Record<string, any> & { name: string };

export function loadViewCounts(): Record<string, number> {
  try {
    const stats = JSON.parse(readFileSync(statsPath, "utf-8"));
    return stats.plugins || {};
  } catch {
    return {};
  }
}

export function loadPlugins(): Plugin[] {
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf-8"));
  const plugins: Plugin[] = marketplace.plugins || [];
  const views = loadViewCounts();

  return [...plugins].sort((a, b) => {
    const av = views[a.name] ?? -1;
    const bv = views[b.name] ?? -1;
    if (av !== bv) return bv - av;
    return a.name.localeCompare(b.name);
  });
}
