// Homepage catalog: search, category/type filters, sort and "load more".
// State lives in the URL (?q=&category=&type=&sort=) so filtered views can be
// shared and the schema.org SearchAction (/?q=) works. The first page is
// server-rendered; the full list is fetched from /plugins.json.

import { cardHtml, type CardPlugin } from "../lib/card";
import { syncToggles } from "./loadout";

type Plugin = CardPlugin & { addedAt?: string | null; updatedAt?: string | null };
type Sort = "popular" | "new" | "updated" | "az";

const PAGE_SIZE = 24;
const SORTS: Sort[] = ["popular", "new", "updated", "az"];

const grid = document.getElementById("plugin-grid")!;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const loadMore = document.getElementById("load-more") as HTMLButtonElement;
const noResults = document.getElementById("no-results")!;
const resultCount = document.getElementById("result-count")!;
const categoryBtns = document.querySelectorAll<HTMLButtonElement>(".category-btn");
const tagBtns = document.querySelectorAll<HTMLButtonElement>(".tag-btn");
const sortBtns = document.querySelectorAll<HTMLButtonElement>(".sort-btn");

let plugins: Plugin[] = JSON.parse(document.getElementById("plugins-data")!.textContent || "[]");
const total = Number(grid.dataset.total || plugins.length);
let fullyLoaded = plugins.length >= total;

const params = new URLSearchParams(location.search);
const state = {
  q: (params.get("q") || "").trim(),
  category: params.get("category") || "all",
  tag: params.get("type") || "all",
  sort: (SORTS.includes(params.get("sort") as Sort) ? params.get("sort") : "popular") as Sort,
  shown: PAGE_SIZE,
};
const isDefault = () => !state.q && state.category === "all" && state.tag === "all" && state.sort === "popular";
// The server-rendered cards already show the default view.
let gridMatchesState = isDefault();

function matches(p: Plugin): boolean {
  const q = state.q.toLowerCase();
  const hay = !q
    ? true
    : [p.name, p.description, ...(p.tags || []), p.author?.name, p.author?.username]
        .some((v) => (v || "").toLowerCase().includes(q));
  return (
    hay &&
    (state.category === "all" || p.category === state.category) &&
    (state.tag === "all" || (p.tags || []).includes(state.tag))
  );
}

const byDate = (key: "addedAt" | "updatedAt") => (a: Plugin, b: Plugin) =>
  (b[key] || "").localeCompare(a[key] || "") || a.name.localeCompare(b.name);

function sorted(list: Plugin[]): Plugin[] {
  switch (state.sort) {
    case "new":
      return [...list].sort(byDate("addedAt"));
    case "updated":
      return [...list].sort(byDate("updatedAt"));
    case "az":
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    default:
      // /plugins.json is already in popularity order.
      return list;
  }
}

function syncUrl() {
  const next = new URLSearchParams();
  if (state.q) next.set("q", state.q);
  if (state.category !== "all") next.set("category", state.category);
  if (state.tag !== "all") next.set("type", state.tag);
  if (state.sort !== "popular") next.set("sort", state.sort);
  const qs = next.toString();
  history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
}

function syncControls() {
  searchInput.value = state.q;
  categoryBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.category === state.category)));
  tagBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tag === state.tag)));
  sortBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sort === state.sort)));
}

function render() {
  const visible = sorted(plugins.filter(matches));
  const count = fullyLoaded ? visible.length : Math.max(visible.length, isDefault() ? total : visible.length);
  resultCount.textContent = String(count);

  if (!gridMatchesState) {
    grid.innerHTML = visible.slice(0, state.shown).map(cardHtml).join("");
    syncToggles(grid);
  }
  gridMatchesState = false;

  noResults.hidden = visible.length > 0 || !fullyLoaded;
  const left = count - Math.min(state.shown, visible.length);
  loadMore.hidden = left <= 0;
  loadMore.querySelector("[data-left]")!.textContent = String(left);
}

function update(change: Partial<typeof state>) {
  Object.assign(state, { shown: PAGE_SIZE }, change);
  syncUrl();
  syncControls();
  ensureLoaded();
  render();
}

let loading: Promise<void> | null = null;
function ensureLoaded() {
  if (fullyLoaded) return;
  loading ??= fetch("/plugins.json")
    .then((r) => r.json())
    .then((data: Plugin[]) => {
      plugins = data;
      fullyLoaded = true;
      // Untouched default view: the server cards are still correct, keep them.
      if (isDefault() && state.shown === PAGE_SIZE && grid.children.length === PAGE_SIZE) gridMatchesState = true;
      render();
    })
    .catch(() => {});
}

searchInput.addEventListener("input", () => update({ q: searchInput.value.trim() }));
categoryBtns.forEach((b) => b.addEventListener("click", () => update({ category: b.dataset.category || "all" })));
tagBtns.forEach((b) => b.addEventListener("click", () => update({ tag: b.dataset.tag || "all" })));
sortBtns.forEach((b) => b.addEventListener("click", () => update({ sort: (b.dataset.sort as Sort) || "popular" })));
loadMore.addEventListener("click", () => {
  const before = state.shown;
  state.shown += PAGE_SIZE;
  ensureLoaded();
  gridMatchesState = false;
  render();
  // Move focus to the first new card for keyboard users.
  grid.querySelectorAll<HTMLAnchorElement>(".card-link")[before]?.focus({ preventScroll: true });
});

syncControls();
if (isDefault()) {
  render();
  // Fetch the rest when idle; first paint stays cheap.
  const idle = () => ensureLoaded();
  "requestIdleCallback" in window ? requestIdleCallback(idle, { timeout: 2000 }) : setTimeout(idle, 200);
} else {
  ensureLoaded();
  render();
}
syncToggles(grid);
