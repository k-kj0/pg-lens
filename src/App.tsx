import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, ClickUIProvider, Text, Title } from '@clickhouse/click-ui';
import { analyzeAll, sortItems, summarize, type SortKey } from './lib/analyze';
import TimeShareChart from './components/TimeShareChart';
import { timeByVerdict } from './lib/chartData';
import { parseInput } from './lib/parse';
import { SAMPLE_ROWS } from './lib/sample';
import type { Analysis, Verdict } from './lib/types';

type Theme = 'light' | 'dark';
type Filter = Verdict | 'all';

const VERDICT_LABEL: Record<Verdict, string> = {
  offload: 'Offload candidate',
  watch: 'Watch',
  keep: 'Keep on Postgres',
};
const VERDICT_STATE: Record<Verdict, 'danger' | 'warning' | 'success'> = {
  offload: 'danger',
  watch: 'warning',
  keep: 'success',
};

function initialTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [text, setText] = useState('');
  const [items, setItems] = useState<Analysis[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('score');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const summary = useMemo(() => (items ? summarize(items) : null), [items]);
  const slices = useMemo(() => (items ? timeByVerdict(items) : []), [items]);
  const visible = useMemo(() => {
    if (!items) return [];
    const list = filter === 'all' ? items : items.filter((a) => a.verdict === filter);
    return sortItems(list, sort);
  }, [items, filter, sort]);

  function run(input: string) {
    const result = parseInput(input);
    setErrors(result.errors);
    setItems(result.rows.length ? analyzeAll(result.rows) : null);
    setFilter('all');
  }

  function loadSample() {
    const json = JSON.stringify(SAMPLE_ROWS, null, 2);
    setText(json);
    run(json);
  }

  function clearAll() {
    setText('');
    setItems(null);
    setErrors([]);
  }

  return (
    <ClickUIProvider theme={theme}>
      <main className="page">
        <header className="header">
          <div>
            <Title type="h1" size="lg">
              pg-lens
            </Title>
            <Text color="muted">Find Postgres queries that look analytical and might belong on ClickHouse.</Text>
          </div>
          <Button
            type="secondary"
            label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </header>

        <section aria-labelledby="input-h" className="card">
          <Title type="h2" size="md" id="input-h">
            1. Paste your pg_stat_statements export
          </Title>
          <p className="note">
            Runs in your browser. Nothing is uploaded or stored. Use <code>scripts/export.sql</code> to get JSON or CSV with
            these columns: queryid, query, calls, total_exec_time, mean_exec_time, rows, shared_blks_hit, shared_blks_read.
          </p>
          <label htmlFor="stats-input" className="label">
            pg_stat_statements export (JSON or CSV)
          </label>
          <textarea
            id="stats-input"
            className="textarea"
            rows={8}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={errors.length ? 'input-errors' : undefined}
            aria-invalid={errors.length > 0}
          />
          <div className="actions">
            <Button type="primary" label="Analyze" onClick={() => run(text)} />
            <Button type="secondary" label="Load sample data" onClick={loadSample} />
            <Button type="empty" label="Clear" onClick={clearAll} />
          </div>
          <div id="input-errors" role="alert">
            {errors.length > 0 && (
              <ul className="errors">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="results-h" className="card">
          <Title type="h2" size="md" id="results-h">
            2. Results
          </Title>
          <div aria-live="polite" className="summary">
            {summary ? (
              <>
                <p className="headline">
                  {fmtPct(summary.offloadTimeShare)} of total query time is spent in queries that look analytical.
                </p>
                <p className="note">
                  {summary.queryCount} queries analysed: {summary.offloadCount} offload candidates, {summary.watchCount} to
                  watch, {summary.keepCount} to keep on Postgres. Total execution time {fmtMs(summary.totalTimeMs)}.
                               </p>
                <TimeShareChart slices={slices} />
              </>
            ) : (
              <p className="note">No results yet. Paste an export and press Analyze, or load the sample data.</p>
            )}
          </div>

          {items && (
            <>
              <div className="controls">
                <div>
                  <label htmlFor="filter" className="label">
                    Show
                  </label>
                  <select id="filter" className="select" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                    <option value="all">All queries</option>
                    <option value="offload">Offload candidates</option>
                    <option value="watch">Watch</option>
                    <option value="keep">Keep on Postgres</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sort" className="label">
                    Sort by
                  </label>
                  <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                    <option value="score">Analytical score</option>
                    <option value="total">Total time</option>
                    <option value="mean">Mean time</option>
                    <option value="calls">Calls</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap" tabIndex={0} role="region" aria-label="Query results table, scrollable">
                <table className="table">
                  <caption className="sr-only">Queries with analytical score, verdict and cost</caption>
                  <thead>
                    <tr>
                      <th scope="col">Verdict</th>
                      <th scope="col">Score</th>
                      <th scope="col">Query and reasons</th>
                      <th scope="col" className="num">
                        Calls
                      </th>
                      <th scope="col" className="num">
                        Total time
                      </th>
                      <th scope="col" className="num">
                        Mean time
                      </th>
                      <th scope="col" className="num">
                        MB per call
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => (
                      <tr key={a.row.queryid}>
                        <td>
                          <Badge text={VERDICT_LABEL[a.verdict]} state={VERDICT_STATE[a.verdict]} size="sm" />
                        </td>
                        <td>{a.score}</td>
                        <td className="query-cell">
                          <details>
                            <summary>
                              <code>{a.row.query.length > 90 ? `${a.row.query.slice(0, 90)}...` : a.row.query}</code>
                            </summary>
                            <pre className="full-query">{a.row.query}</pre>
                            <ul className="reasons">
                              {a.reasons.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          </details>
                        </td>
                        <td className="num">{fmtInt(a.row.calls)}</td>
                        <td className="num">{fmtMs(a.row.total_exec_time)}</td>
                        <td className="num">{fmtMs(a.row.mean_exec_time)}</td>
                        <td className="num">{fmtMB(a.blocksPerCall)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length === 0 && <p className="note">No queries match this filter.</p>}
              </div>
            </>
          )}
        </section>

        <footer className="footer">
          <p className="note">
            This is a heuristic. It reads query text and I/O counters only, so it cannot see your schema, indexes or data.
            Check an offload candidate with EXPLAIN and a trial on ClickHouse before moving anything. The sample data is
            synthetic.
          </p>
        </footer>
      </main>
    </ClickUIProvider>
  );
}
