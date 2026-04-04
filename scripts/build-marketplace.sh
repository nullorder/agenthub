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

echo "Built marketplace.json with $(echo "$plugins_array" | jq 'length') plugin(s)."
