#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
OUTPUT="$REPO_ROOT/marketplace.json"

# Collect all plugin JSON files, sorted by name for deterministic output
plugin_files=()
for f in "$PLUGINS_DIR"/*.json; do
  [ -f "$f" ] && plugin_files+=("$f")
done

# Build the plugins array
if [ ${#plugin_files[@]} -eq 0 ]; then
  plugins_array="[]"
else
  plugins_array=$(cat "${plugin_files[@]}" | jq -s '.')
fi

# Assemble the final marketplace.json
jq -n \
  --argjson plugins "$plugins_array" \
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
    "plugins": $plugins
  }' > "$OUTPUT"

plugin_count=$(echo "$plugins_array" | jq 'length')
author_count=$(echo "$plugins_array" | jq '[.[].author.username] | unique | length')

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
