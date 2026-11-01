// Loadout: a per-visitor list of plugins to install together. Lives in
// localStorage (a convenience, so failures are swallowed) and keeps every
// [data-loadout-toggle] button on the page in sync.

const KEY = "agenthub:loadout";
const listeners = new Set<(names: string[]) => void>();

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}

let names = read();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(names));
  } catch {}
  syncToggles();
  listeners.forEach((fn) => fn([...names]));
}

export function getLoadout(): string[] {
  return [...names];
}

export function hasPlugin(name: string): boolean {
  return names.includes(name);
}

export function togglePlugin(name: string) {
  names = hasPlugin(name) ? names.filter((n) => n !== name) : [...names, name];
  write();
}

export function removePlugin(name: string) {
  names = names.filter((n) => n !== name);
  write();
}

export function clearLoadout() {
  names = [];
  write();
}

export function onLoadoutChange(fn: (names: string[]) => void) {
  listeners.add(fn);
  fn([...names]);
}

export function syncToggles(root: ParentNode = document) {
  root.querySelectorAll<HTMLButtonElement>("[data-loadout-toggle]").forEach((btn) => {
    const name = btn.dataset.loadoutToggle || "";
    const on = hasPlugin(name);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", `${on ? "Remove" : "Add"} ${name} ${on ? "from" : "to"} loadout`);
  });
}

export function shellCommands(list = names): string {
  return ["claude plugin marketplace add nullorder/agenthub", ...list.map((n) => `claude plugin install ${n}@agenthub`)].join("\n");
}

export function slashCommands(list = names): string {
  return ["/plugin marketplace add nullorder/agenthub", ...list.map((n) => `/plugin install ${n}@agenthub`)].join("\n");
}

let wired = false;
export function wireToggles() {
  if (wired) return;
  wired = true;
  document.addEventListener("click", (e) => {
    const btn = (e.target as Element | null)?.closest<HTMLButtonElement>("[data-loadout-toggle]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    togglePlugin(btn.dataset.loadoutToggle || "");
  });
  // Another tab changed the loadout.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    names = read();
    syncToggles();
    listeners.forEach((fn) => fn([...names]));
  });
  syncToggles();
}
