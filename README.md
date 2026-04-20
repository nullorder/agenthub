<p align="center">
  <a href="https://agenthub.nullorder.org">
    <img src="./site/public/agenthub.gif" alt="AgentHub" width="100%" />
  </a>
</p>

<h1 align="center"><a href="https://agenthub.nullorder.org">AgentHub</a></h1>

<p align="center">A community-driven plugin marketplace for Claude Code. Open to everyone.</p>

[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/AJMEeFXxXy)
[![X (Twitter)](https://img.shields.io/badge/@orderofnull-000000?logo=x&logoColor=white)](https://x.com/orderofnull)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<!-- STATS:START -->
**301** plugins | **73** authors
<!-- STATS:END -->

## Install

```sh
/plugin marketplace add nullorder/agenthub
```

## Browse & install plugins

```sh
/plugin
```

Go to the **Discover** tab to see available plugins, then install what you need:

```sh
/plugin install <plugin-name>@agenthub
```

## Update plugins

Plugins are cached locally when you install them — pushes to an author's repo
don't reach your machine automatically. To pull the latest version of a
plugin you already have installed:

```sh
/plugin marketplace update agenthub       # refresh the catalog and plugin sources
/plugin update <plugin-name>@agenthub     # apply changes for one plugin
/reload-plugins                            # re-scan so new skills/agents appear
```

**For plugin authors:** once your plugin is listed in agenthub, pushing to
your source (GitHub repo, Git URL, Git subdir, or npm) is enough — the next
`/plugin marketplace update` picks up your changes. You only need to open
another PR to agenthub if you're changing the marketplace entry itself
(description, category, tags, etc.). See [CONTRIBUTING.md](CONTRIBUTING.md#updating-your-plugin)
for details.

## Contributing

We welcome plugins of all kinds — skills, commands, agents, hooks, MCP servers, and LSP servers.

Your plugin code stays in **your own repo**. You submit a PR that adds a reference to it in our `plugins/` directory. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Badge

If you wanna add your plugin to Agenthub, you can also add this badge to your plugin's README:

[![AgentHub](https://agenthub.nullorder.org/badge.svg)](https://agenthub.nullorder.org)

**Markdown:**

```md
[![AgentHub](https://agenthub.nullorder.org/badge.svg)](https://agenthub.nullorder.org)
```

**HTML:**

```html
<a href="https://agenthub.nullorder.org">
  <img src="https://agenthub.nullorder.org/badge.svg" alt="AgentHub" />
</a>
```

## Increase the skill budget

Claude Code limits how many plugin skills are injected into the system prompt (~15,000 characters by default). With a large marketplace like AgentHub, some plugins may be silently truncated.

To fix this, increase the budget:

```sh
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

Add it to your shell profile (`~/.zshrc`, `~/.bashrc`, `~/.envrc` etc.) to make it permanent. See [anthropics/claude-code#14549](https://github.com/anthropics/claude-code/issues/14549) for details.

## License

This marketplace catalog is licensed under [MIT](LICENSE). Individual plugins have their own licenses — see each plugin's repository for details.

### References

- Marketplace creation: https://code.claude.com/docs/en/plugin-marketplaces
- Plugin creation: https://code.claude.com/docs/en/plugins
- Plugin manifest schema: https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema
- Discover/install plugins: https://code.claude.com/docs/en/discover-plugins
