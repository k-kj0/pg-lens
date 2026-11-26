# pg-lens

Paste a `pg_stat_statements` export and see which Postgres queries **look analytical** and might belong on ClickHouse, plus what share of your total query time they take.

- Runs in your browser. Nothing is uploaded or stored.
- Scores each query from its text and I/O counters (a heuristic, see limits below).
- React, TypeScript, Vite, [`@clickhouse/click-ui`](https://www.npmjs.com/package/@clickhouse/click-ui). Light and dark themes.

> Live demo:[ https://pr-lens-pi.vercel.app/ ] &nbsp;|&nbsp; Screenshot: _add a GIF of "Load sample data" here_

## Use it

1. Run `scripts/export.sql` against your database (needs the `pg_stat_statements` extension, PostgreSQL 13+).
2. Paste the JSON or CSV into the app and press **Analyze**.
3. Open a row to see the full query and why it was scored that way.

Or press **Load sample data** to try it. The sample is synthetic.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests, including axe checks in jsdom
npm run build
npm run e2e        # Playwright + axe in a real browser (run `npx playwright install chromium` once)
```

Node 22 or newer.

## How the score works

Points are added for aggregates, GROUP BY, window functions, `date_trunc`, `count(distinct)`, many joins, large blocks touched per call and slow calls; points are removed for point lookups by id. Writes, DDL and `FOR UPDATE` always stay on Postgres. A query is only an "Offload candidate" at 60 or more points **and** if it aggregates or windows. All weights are in `src/lib/analyze.ts`.

## Limits

This is a heuristic. It cannot see your schema, indexes or data. Treat an offload verdict as a reason to run `EXPLAIN` and a trial, not as proof. See `docs/DESIGN.md` for decisions and trade-offs.

## Status of checks
- Unit tests, type check and production build pass locally.
- The Playwright accessibility run (which includes colour contrast) is defined in `.github/workflows/a11y.yml`. Check its first CI result and fix anything it reports; do not weaken the test.
- `scripts/export.sql` has not been run against a live database yet.
