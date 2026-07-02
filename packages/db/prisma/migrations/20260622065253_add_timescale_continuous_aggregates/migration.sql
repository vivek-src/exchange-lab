-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert trades table into hypertable
SELECT create_hypertable(
    'trades',
    'timestamp',
    if_not_exists => TRUE
);

----------------------------------------------------
-- 1 Minute Candles
----------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1m
WITH (
    timescaledb.continuous,
    timescaledb.materialized_only = false
) AS
SELECT
    market,
    time_bucket(INTERVAL '1 minute', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

----------------------------------------------------
-- 1 Hour Candles
----------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1h
WITH (
    timescaledb.continuous,
    timescaledb.materialized_only = false
) AS
SELECT
    market,
    time_bucket(INTERVAL '1 hour', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

----------------------------------------------------
-- 1 Day Candles
----------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1d
WITH (
    timescaledb.continuous,
    timescaledb.materialized_only = false
) AS
SELECT
    market,
    time_bucket(INTERVAL '1 day', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

----------------------------------------------------
-- 1 Week Candles
----------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1w
WITH (
    timescaledb.continuous,
    timescaledb.materialized_only = false
) AS
SELECT
    market,
    time_bucket(INTERVAL '1 week', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket
WITH NO DATA;

----------------------------------------------------
-- Refresh Policies
----------------------------------------------------

SELECT add_continuous_aggregate_policy(
    'klines_1m',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute'
);

SELECT add_continuous_aggregate_policy(
    'klines_1h',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '5 minutes'
);

SELECT add_continuous_aggregate_policy(
    'klines_1d',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '15 minutes'
);

SELECT add_continuous_aggregate_policy(
    'klines_1w',
    start_offset => INTERVAL '6 months',
    end_offset => INTERVAL '1 week',
    schedule_interval => INTERVAL '1 hour'
);
