# Traffic stats

GitHub traffic data for `nullorder/agenthub`, collected daily by
[`.github/workflows/traffic.yml`](../.github/workflows/traffic.yml) and rendered
on [`/stats`](https://agenthub.nullorder.org/stats).

## Layout

- `views/YYYY-MM-DD.json` — page views on that UTC date (`count`, `uniques`)
- `clones/YYYY-MM-DD.json` — git clones on that UTC date (`count`, `uniques`)
- `referrers.json` — top referring sites over the last 14 days (snapshot,
  overwritten each run)
- `paths.json` — top viewed paths over the last 14 days (snapshot, overwritten
  each run)

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
