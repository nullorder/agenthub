// Shared HTML renderers for plugin cards and avatars. Used by Astro at build
// time (via set:html) and by the catalog script in the browser, so server and
// client cards can never drift apart. Keep this file free of Node imports.

import type { PluginSource } from "./source";

export const CATEGORIES = [
  "development",
  "testing",
  "devops",
  "security",
  "documentation",
  "productivity",
  "data",
  "design",
  "other",
];

export interface CardPlugin {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  license?: string;
  source?: PluginSource;
  author?: { username?: string; name?: string };
  views?: number;
  stars?: number;
}

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function categoryClass(category?: string): string {
  return `cat cat-${CATEGORIES.includes(category || "") ? category : "other"}`;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 5x5 mirrored pixel pattern, shown under the GitHub avatar and left in place
// when the avatar fails to load.
export function identicon(seed: string): string {
  const h = hash(seed);
  const hue = h % 360;
  let cells = "";
  for (let i = 0; i < 15; i++) {
    if ((h >>> i) & 1) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      cells += `<rect x="${col}" y="${row}" width="1" height="1"/>`;
      if (col < 2) cells += `<rect x="${4 - col}" y="${row}" width="1" height="1"/>`;
    }
  }
  return `<svg viewBox="0 0 5 5" shape-rendering="crispEdges" aria-hidden="true"><rect width="5" height="5" fill="hsl(${hue} 45% 18%)"/><g fill="hsl(${hue} 75% 65%)">${cells}</g></svg>`;
}

// GitHub avatar drawn at half resolution with pixelated scaling, so faces read
// as 8-bit sprites. `sharp` loads a full-resolution copy on hover.
export function avatarHtml(username: string | undefined, size: number, opts: { sharp?: boolean } = {}): string {
  const user = username || "unknown";
  const px = Math.max(8, Math.round(size / 2));
  const src = `https://github.com/${encodeURIComponent(user)}.png?size=${px}`;
  const sharp = opts.sharp ? ` data-sharp="https://github.com/${encodeURIComponent(user)}.png?size=${size * 2}"` : "";
  return `<span class="px-avatar" style="width:${size}px;height:${size}px">${identicon(user)}<img src="${src}"${sharp} width="${size}" height="${size}" alt="" loading="lazy" decoding="async" onerror="this.remove()"></span>`;
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}k`;
}

export function relTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d`;
  if (s < 86400 * 365) return `${Math.round(s / (86400 * 30))}mo`;
  return `${Math.round(s / (86400 * 365))}y`;
}

export function loadoutButtonHtml(name: string, extra = ""): string {
  return `<button type="button" class="loadout-toggle ${extra}" data-loadout-toggle="${esc(name)}" aria-pressed="false" aria-label="Add ${esc(name)} to loadout"><span class="lt-off">+ Add</span><span class="lt-on">✓ Added</span></button>`;
}

export function cardHtml(p: CardPlugin): string {
  const author = p.author || {};
  const authorName = author.name || `@${author.username}`;
  const tags = (p.tags || [])
    .map((t) => `<span class="rounded border border-line bg-panel px-1.5 py-0.5 text-xs font-medium text-ink-2">${esc(t)}</span>`)
    .join("");
  const license = p.license ? `<span class="license-badge rounded px-2 py-0.5 text-xs">${esc(p.license)}</span>` : "";
  const stats = [
    p.views ? `<span title="${p.views} views">▲ ${compactNumber(p.views)}</span>` : "",
    p.stars ? `<span title="${p.stars} GitHub stars">★ ${compactNumber(p.stars)}</span>` : "",
  ].join("");

  // Allow line breaks only after hyphens so names never split mid-word.
  const title = esc(p.name).replace(/-/g, "-<wbr>");

  return `<article class="plugin-card hud-frame group flex flex-col rounded-xl border border-line bg-panel p-5 backdrop-blur-lg transition-colors hover:border-line-strong hover:bg-panel-2" data-name="${esc(p.name)}">
  <h3 class="font-pixel mb-3 text-[21px] leading-[1.25] text-ink [overflow-wrap:break-word] group-hover:text-cyan transition-colors"><a href="/plugins/${esc(p.name)}" class="card-link">${title}</a></h3>
  <p class="mb-3 text-base leading-relaxed text-ink-2 line-clamp-3">${esc(p.description)}</p>
  <div class="mb-3 flex flex-wrap items-center gap-1.5"><span class="${categoryClass(p.category)} rounded-full px-2.5 py-0.5 text-xs font-medium">${esc(p.category)}</span>${tags}${license}</div>
  <div class="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3">
    <a href="/authors/${esc(author.username)}" class="author-link relative z-10 flex min-w-0 items-center gap-2 text-sm">${avatarHtml(author.username, 20)}<span class="author-name truncate">${esc(authorName)}</span></a>
    <div class="flex shrink-0 items-center gap-3">
      <span class="font-mono text-xs text-magenta flex gap-2">${stats}</span>
      ${loadoutButtonHtml(p.name, "relative z-10")}
    </div>
  </div>
</article>`;
}
