export type PluginSource =
  | string
  | {
      source?: string;
      repo?: string;
      url?: string;
      package?: string;
      path?: string;
    }
  | null
  | undefined;

export function getSourceUrl(source: PluginSource): string {
  if (typeof source === "string" || !source) return "";
  switch (source.source) {
    case "github":
      return source.repo ? `https://github.com/${source.repo}` : "";
    case "url":
    case "git-subdir":
      return (source.url || "").replace(/\.git$/, "");
    case "npm":
      return source.package
        ? `https://www.npmjs.com/package/${source.package}`
        : "";
    default:
      return "";
  }
}

export function getSourceRepo(source: PluginSource): string {
  if (typeof source === "string" || !source) return "";
  if (source.source === "github") return source.repo || "";
  if (source.source === "url" || source.source === "git-subdir") {
    const m = (source.url || "").match(
      /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/,
    );
    return m ? m[1] : "";
  }
  return "";
}

export function getSourceLabel(source: PluginSource): string {
  if (typeof source === "string" || !source) return "local";
  return source.source === "git-subdir" ? "git" : source.source || "unknown";
}
