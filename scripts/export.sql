-- Requires the pg_stat_statements extension (PostgreSQL 13 or newer for these column names).
-- Check it is enabled:   SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
--
-- Option 1: JSON (paste the single value into pg-lens)
SELECT json_agg(t)
FROM (
  SELECT queryid::text AS queryid, query, calls, total_exec_time, mean_exec_time, rows,
         shared_blks_hit, shared_blks_read
  FROM pg_stat_statements
  ORDER BY total_exec_time DESC
  LIMIT 200
) t;

-- Option 2: CSV from psql (run this line in psql, then open the file and paste it)
-- \copy (SELECT queryid::text AS queryid, query, calls, total_exec_time, mean_exec_time, rows, shared_blks_hit, shared_blks_read FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 200) TO 'stats.csv' CSV HEADER
--
-- Note: pg_stat_statements normalises constants to $1, $2 ... but queries can still contain table and
-- column names you consider sensitive. pg-lens never uploads anything, but check before sharing exports.
