# Contributing to AgentHub

Thanks for considering a contribution! AgentHub is a catalog — your plugin code lives in your own repository (or npm package), and you add a reference here.

## Submitting a plugin

1. **Build your plugin** in your own GitHub repo, Git repository, or npm package. Make sure it has a valid `.claude-plugin/plugin.json` manifest. See the [Claude Code plugin docs](https://code.claude.com/docs/en/plugins) for details.

2. **Fork this repo** and create a new file in the `plugins/` directory named after your plugin:

```sh
touch plugins/your-plugin-name.json
```

With the following content:

```json
{
  "name": "your-plugin-name",
  "source": {
    "source": "github",
    "repo": "your-username/your-plugin-repo"
  },
  "description": "A brief description of what your plugin does",
  "version": "1.0.0",
  "author": {
    "username": "your-username"
  },
  "category": "development",
  "license": "MIT",
  "tags": ["skills", "agents"]
}
```

### Tags

The `tags` field is **required** and must include **at least one** of the component types below. It tells users what your plugin provides:

- `skills` — skill directories with `SKILL.md`
- `agents` — subagent markdown files
- `commands` — slash command markdown files
- `hooks` — event hooks (`hooks.json`)
- `mcp-servers` — MCP server configurations
- `lsp-servers` — language server configurations
- `integration` — external tool integrations (not a Claude Code plugin per se)
- `other` — anything that doesn't fit the categories above

You may also add free-form descriptive tags alongside the type tag (e.g. `["skills", "python", "aws"]`).

<details>
<summary>Alternative sources (Git URL, Git subdirectory, npm)</summary>

#### Git URL

For plugins hosted on GitLab, Bitbucket, or other Git hosts:

```json
{
  "name": "your-plugin-name",
  "source": {
    "source": "url",
    "url": "https://gitlab.com/your-username/your-plugin-repo.git"
  },
  "description": "A brief description of what your plugin does",
  "version": "1.0.0",
  "author": {
    "username": "your-username"
  },
  "category": "development",
  "license": "MIT"
}
```

You can optionally pin to a branch/tag with `"ref"` or an exact commit with `"sha"`.

#### Git subdirectory

For plugins that live inside a subdirectory of a larger repo (e.g. monorepos):

```json
{
  "name": "your-plugin-name",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/your-username/your-monorepo.git",
    "path": "packages/your-plugin"
  },
  "description": "A brief description of what your plugin does",
  "version": "1.0.0",
  "author": {
    "username": "your-username"
  },
  "category": "development",
  "license": "MIT"
}
```

You can optionally pin to a branch/tag with `"ref"` or an exact commit with `"sha"`.

#### npm

For plugins published to npm:

```json
{
  "name": "your-plugin-name",
  "source": {
    "source": "npm",
    "package": "@your-scope/your-plugin"
  },
  "description": "A brief description of what your plugin does",
  "version": "1.0.0",
  "author": {
    "username": "your-username"
  },
  "category": "development",
  "license": "MIT"
}
```

You can optionally specify `"version"` (e.g. `"^2.0.0"`) and `"registry"` for private registries.

</details>

3. **Open a pull request** with your new file.

> **Note:** Do not edit `.claude-plugin/marketplace.json` directly — it is auto-generated from the files in `plugins/` after your PR is merged.

## Plugin naming

- Use kebab-case: `my-cool-plugin`, not `MyCoolPlugin`
- Be descriptive: `react-test-generator` over `rtg`
- Don't use "claude", "anthropic", or "official" in your plugin name
- The filename must match the plugin name: `plugins/my-cool-plugin.json`

## Categories

Use one of the following for the `category` field:

- `development` — coding tools, language support, scaffolding
- `testing` — test generation, coverage, QA
- `devops` — CI/CD, deployment, infrastructure
- `security` — auditing, scanning, compliance
- `documentation` — doc generation, API docs, readmes
- `productivity` — workflow automation, task management
- `data` — data analysis, database tools, AI/ML
- `design` — UI/UX, frontend, accessibility
- `other` — anything that doesn't fit above

## Requirements

- Your plugin must have a valid `.claude-plugin/plugin.json` manifest
- **For GitHub repos and Git URLs:** the repository must be publicly accessible (or provide install instructions for private repos). Include a `README.md` and a `LICENSE` file in your repository.
- **For Git subdirectories:** the parent repository must be publicly accessible. The plugin subdirectory must include a `README.md` and a `LICENSE` file.
- **For npm packages:** the package must be published to a public registry (or provide install instructions for private registries). Include a `README.md` and a `LICENSE` file in your package.

## Updating your plugin

Publishing a new version of your plugin to AgentHub users is a two-step flow:

1. **Push the new version to your source** (GitHub repo, Git URL, Git subdirectory, or a new npm release) and bump the `version` field in your plugin's own manifest (e.g. `.claude-plugin/plugin.json`).
2. **Open a PR here** updating the `version` field in `plugins/<your-plugin>.json` to match.

Both versions must match. Claude Code's `/plugin update <name>@agenthub` compares the user's installed version against the version declared in this marketplace — **not** your source's git HEAD. If the registry entry here still points at the old version, `/plugin update` reports `"already at the latest version"` and your changes never reach users who have already installed the plugin, even if your source has moved on.

For **metadata-only changes** (description, category, tags, author info — anything that doesn't ship a new version of the plugin itself), just edit your file in `plugins/` and open a PR. A `version` bump is not required.

> **Note:** Do not edit `.claude-plugin/marketplace.json` — it is auto-generated from `plugins/` after your PR is merged.

## Removing a plugin

Open a PR removing your file from `plugins/`, or open an issue requesting removal.

## Need help?

If you have questions or need help with your submission, join our [Discord](https://discord.gg/AJMEeFXxXy) and ask in the community channels. You can also reach us on [X (@orderofnull)](https://x.com/orderofnull).
