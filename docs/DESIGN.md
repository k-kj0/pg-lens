# Design notes: pg-lens

## Problem

Postgres teams often run reporting and dashboard queries on the same database as their application. Those queries (large scans, GROUP BY, window functions) are slow, compete with transactional traffic and are the usual candidates to move to an analytical database such as ClickHouse. `pg_stat_statements` already holds the evidence, but it is a flat table of thousands of rows. Finding "which of these are analytical, and how much of my total time do they take?" means reading SQL by hand.

pg-lens answers that question for one export: it scores each query, labels it **Offload candidate**, **Watch** or **Keep on Postgres**, and shows what share of total execution time the offload candidates account for.

I could not verify that no tool does anything similar. It is a small, narrow helper, not a claim of novelty.

## Users

An application developer or DBA who has Postgres access, wants a fast first pass, and does not want to install an agent or send query text to a hosted service.

## Decisions

| Decision | Why | Trade-off |
|---|---|---|
| Run entirely in the browser; the user pastes an export | Nothing is uploaded, so query text never leaves the machine. It also needs no backend or database to host, so the demo is free to deploy | The user must run one SQL statement; there is no live monitoring |
| Score from query text and I/O counters only | These are all `pg_stat_statements` provides, so the tool works on any export | It cannot see schema, indexes or data. A verdict is a prompt to run EXPLAIN, not a fact |
| Weights and thresholds live in one object (`WEIGHTS`, `THRESHOLDS` in `src/lib/analyze.ts`) | They are judgement calls, so they should be easy to read, change and challenge | No calibration against real workloads yet |
| Strip comments and string literals before matching | Otherwise a string such as `'sum(x)'` would count as an aggregate | A regex is still not a SQL parser. Unusual SQL can be misread |
| Never label a query "offload" on I/O size alone | A big scan without aggregation is not analytical work | Misses some heavy read queries; they land on "Watch" |
| Writes, DDL and `FOR UPDATE` are always "Keep on Postgres" | They are transactional by definition | A write-heavy batch job is not flagged |
| Native table, `<details>` for the full query, labelled selects | Keyboard and screen-reader behaviour comes from the platform instead of custom widgets | Less flexible than a data-grid component |
| Use `@clickhouse/click-ui` for the provider, headings, text, badges and buttons | Matches the ClickHouse design language and gives light and dark themes | Large bundle (about 1.5 MB before gzip) because the whole library is pulled in. Importing per-component would reduce it |
| Verdict is a text badge, not colour alone | Colour must not be the only signal | None |

## Accessibility

- One `main`, one `h1`, logical heading order, a label on every control, a caption on the table (visually hidden).
- Results summary uses `aria-live="polite"`; input errors use `role="alert"`.
- Light and dark themes, following the system setting, with a toggle.
- Automated: axe runs in jsdom inside the unit tests (structure and names). Playwright plus axe runs in CI against the built app in both themes (this adds colour-contrast checks that jsdom cannot do).
- Not done: manual screen-reader testing. A contrast failure in a click-ui badge or button, if any, would show up in the Playwright run.

## Known limits

- Heuristic only; see above.
- Input is capped at 5,000 rows and 5 MB.
- Assumes PostgreSQL 13 or newer column names (`total_exec_time`, `mean_exec_time`). Older versions use `total_time` and `mean_time`; the parser accepts those names as well.
- Block counts are per call averages and include cache hits, so a hot cached table can look like a large scan.
- Sample data is synthetic.

## Next steps

- Calibrate weights on real exports (with permission).
- Suggest the ClickHouse engine and an ORDER BY key for a flagged query.
- Per-component imports to shrink the bundle.
