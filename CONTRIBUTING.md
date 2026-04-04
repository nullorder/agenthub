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
    "name": "Your Name"
  },
  "category": "development"
}
```

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
    "name": "Your Name"
  },
  "category": "development"
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
    "name": "Your Name"
  },
  "category": "development"
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
    "name": "Your Name"
  },
  "category": "development"
}
```

You can optionally specify `"version"` (e.g. `"^2.0.0"`) and `"registry"` for private registries.

</details>

3. **Open a pull request** with your new file.

> **Note:** Do not edit `marketplace.json` directly — it is auto-generated from the files in `plugins/` after your PR is merged.

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

Since we reference your source directly, updates to your plugin are picked up automatically when users run `/plugin marketplace update`:

- **For GitHub repos and Git URLs:** push changes to your repository.
- **For Git subdirectories:** push changes to the plugin subdirectory in your repository.
- **For npm packages:** publish a new version to the registry.

If you need to change the marketplace entry itself (description, category, version bump), edit your file in `plugins/` and open a new PR.

## Removing a plugin

Open a PR removing your file from `plugins/`, or open an issue requesting removal.
