-- This is an empty migration.

-- 1. Ensure the extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Upgrade the 'trades' table to a hypertable (Safe to run if it already is one)
SELECT create_hypertable('trades', 'timestamp', if_not_exists => TRUE);

-- 3. Create 1-Minute Continuous Aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1m 
WITH (timescaledb.continuous) AS
SELECT
    market,
    time_bucket('1 minute', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

-- 4. Create 1-Hour Continuous Aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1h 
WITH (timescaledb.continuous) AS
SELECT
    market,
    time_bucket('1 hour', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

-- 5. Create 1-Day (24-Hour) Continuous Aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1d 
WITH (timescaledb.continuous) AS
SELECT
    market,
    time_bucket('1 day', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

-- 6. Create 1-Week Continuous Aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1w 
WITH (timescaledb.continuous) AS
SELECT
    market,
    time_bucket('1 week', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

-- 7. Setup Automated Refresh Policies
-- (These will fail safely if the policy already exists)
SELECT add_continuous_aggregate_policy('klines_1m',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '0 seconds',
  schedule_interval => INTERVAL '10 seconds');

SELECT add_continuous_aggregate_policy('klines_1h',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '0 seconds',
  schedule_interval => INTERVAL '1 minute');

SELECT add_continuous_aggregate_policy('klines_1w',
  start_offset => INTERVAL '2 months',
  end_offset => INTERVAL '0 seconds',
  schedule_interval => INTERVAL '1 hour');