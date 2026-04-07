#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
OUTPUT="$REPO_ROOT/.claude-plugin/marketplace.json"

# Collect all plugin JSON files, sorted by name for deterministic output
plugin_files=()
for f in "$PLUGINS_DIR"/*.json; do
  [ -f "$f" ] && plugin_files+=("$f")
done

# Build the plugins array into a temp file (avoids ARG_MAX limits with many plugins)
plugins_tmp="$(mktemp)"
trap 'rm -f "$plugins_tmp"' EXIT

if [ ${#plugin_files[@]} -eq 0 ]; then
  echo "[]" > "$plugins_tmp"
else
  cat "${plugin_files[@]}" | jq -s '.' > "$plugins_tmp"
fi

# Assemble the final marketplace.json
jq -n \
  --slurpfile plugins "$plugins_tmp" \
  '{
    "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
    "name": "agenthub",
    "version": "1.0.0",
    "metadata": {
      "description": "A community-driven marketplace for Claude Code plugins. Open to all contributors."
    },
    "owner": {
      "name": "nullorder"
    },
    "plugins": $plugins[0]
  }' > "$OUTPUT"

plugin_count=$(jq 'length' "$plugins_tmp")
author_count=$(jq '[.[].author.username] | unique | length' "$plugins_tmp")

echo "Built marketplace.json with $plugin_count plugin(s) from $author_count author(s)."

# Update README stats
README="$REPO_ROOT/README.md"
if [ -f "$README" ]; then
  awk -v pc="$plugin_count" -v cc="$author_count" '
    /<!-- STATS:START -->/ {
      print "<!-- STATS:START -->"
      print "**" pc "** plugins | **" cc "** authors"
      print "<!-- STATS:END -->"
      skip=1; next
    }
    /<!-- STATS:END -->/ { skip=0; next }
    !skip { print }
  ' "$README" > "$README.tmp" && mv "$README.tmp" "$README"
  echo "Updated README.md stats."
fi
