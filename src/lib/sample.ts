/**
 * SYNTHETIC sample data shaped like pg_stat_statements output.
 * It is invented for the demo and does not come from any real database.
 */
export const SAMPLE_ROWS = [
  { queryid: '1001', query: "SELECT date_trunc('day', created_at) AS day, count(*) AS orders, sum(total_cents) / 100.0 AS revenue FROM orders WHERE created_at >= $1 GROUP BY 1 ORDER BY 1", calls: 420, total_exec_time: 3150000, mean_exec_time: 7500, rows: 12600, shared_blks_hit: 21000000, shared_blks_read: 6300000 },
  { queryid: '1002', query: 'SELECT p.category, count(DISTINCT o.customer_id) AS buyers, avg(oi.unit_price_cents) AS avg_price FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id JOIN customers c ON c.id = o.customer_id GROUP BY p.category', calls: 96, total_exec_time: 1420000, mean_exec_time: 14791, rows: 960, shared_blks_hit: 9100000, shared_blks_read: 4200000 },
  { queryid: '1003', query: 'SELECT customer_id, total_cents, rank() OVER (PARTITION BY region ORDER BY total_cents DESC) AS rnk FROM orders WHERE created_at > $1', calls: 60, total_exec_time: 480000, mean_exec_time: 8000, rows: 540000, shared_blks_hit: 2800000, shared_blks_read: 900000 },
  { queryid: '1004', query: 'SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FROM api_events WHERE service = $1 AND ts > $2', calls: 1800, total_exec_time: 900000, mean_exec_time: 500, rows: 1800, shared_blks_hit: 12000000, shared_blks_read: 800000 },
  { queryid: '1005', query: 'SELECT * FROM orders WHERE id = $1', calls: 9800000, total_exec_time: 410000, mean_exec_time: 0.04, rows: 9800000, shared_blks_hit: 39200000, shared_blks_read: 12000 },
  { queryid: '1006', query: 'SELECT id, email FROM users WHERE email = $1', calls: 2400000, total_exec_time: 190000, mean_exec_time: 0.08, rows: 2300000, shared_blks_hit: 9600000, shared_blks_read: 5000 },
  { queryid: '1007', query: 'INSERT INTO api_events (service, route, status, duration_ms, ts) VALUES ($1, $2, $3, $4, $5)', calls: 31000000, total_exec_time: 2600000, mean_exec_time: 0.08, rows: 31000000, shared_blks_hit: 98000000, shared_blks_read: 41000 },
  { queryid: '1008', query: 'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', calls: 1200000, total_exec_time: 1900000, mean_exec_time: 1.6, rows: 1200000, shared_blks_hit: 7400000, shared_blks_read: 30000 },
  { queryid: '1009', query: 'SELECT id, status FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20', calls: 5200000, total_exec_time: 780000, mean_exec_time: 0.15, rows: 98000000, shared_blks_hit: 31000000, shared_blks_read: 160000 },
  { queryid: '1010', query: 'SELECT count(*) FROM sessions WHERE last_seen > now() - interval \'5 minutes\'', calls: 86400, total_exec_time: 52000, mean_exec_time: 0.6, rows: 86400, shared_blks_hit: 1700000, shared_blks_read: 1000 },
  { queryid: '1011', query: "SELECT status, count(*) FROM orders WHERE created_at > now() - interval '30 days' GROUP BY status", calls: 14400, total_exec_time: 2100000, mean_exec_time: 145.8, rows: 57600, shared_blks_hit: 30000000, shared_blks_read: 3000000 },
  { queryid: '1012', query: 'SELECT * FROM products WHERE id = ANY($1)', calls: 800000, total_exec_time: 240000, mean_exec_time: 0.3, rows: 6400000, shared_blks_hit: 4100000, shared_blks_read: 2000 },
  { queryid: '1013', query: 'SELECT sku, stock FROM inventory WHERE warehouse_id = $1 FOR UPDATE', calls: 250000, total_exec_time: 310000, mean_exec_time: 1.24, rows: 1900000, shared_blks_hit: 2100000, shared_blks_read: 800 },
  { queryid: '1014', query: 'SELECT max(updated_at) FROM customers', calls: 3600, total_exec_time: 9000, mean_exec_time: 2.5, rows: 3600, shared_blks_hit: 9000, shared_blks_read: 0 },
];
