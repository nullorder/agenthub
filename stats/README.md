# Traffic stats

GitHub traffic data for `nullorder/agenthub`, collected daily by
[`.github/workflows/traffic.yml`](../.github/workflows/traffic.yml) and rendered
on [`/stats`](https://agenthub.nullorder.org/stats).

## Layout

- `views/YYYY-MM-DD.json` — page views on that UTC date (`count`, `uniques`)
- `clones/YYYY-MM-DD.json` — git clones on that UTC date (`count`, `uniques`)

Each daily file:

```json
{ "date": "2026-04-13", "count": 42, "uniques": 17 }
```

## Retention caveat

GitHub's traffic API only retains the last 14 days. The workflow polls daily
and overwrites every bucket in the window, so missed runs backfill
automatically — but missing more than 14 consecutive days loses those buckets
permanently.

## Scope

Only the agenthub catalog repo is tracked. No per-plugin analytics. Plugin
repos remain on GitHub and are not proxied.

## Required secret: `TRAFFIC_TOKEN`

GitHub's built-in `GITHUB_TOKEN` cannot access the Traffic API — those
endpoints require `Administration: read`, a scope that isn't exposed via
workflow `permissions:`. The workflow uses a repo secret named
`TRAFFIC_TOKEN`: a fine-grained PAT scoped to this repo with
`Administration: Read-only` and `Metadata: Read-only`. Rotate before
expiry or the daily run will start failing.
