
-- 1-MINUTE K-LINES
CREATE MATERIALIZED VIEW klines_1m AS
SELECT
    market,
    date_trunc('minute', timestamp) AS bucket,
    (array_agg(price ORDER BY timestamp ASC))[1] AS open,
    max(price) AS high,
    min(price) AS low,
    (array_agg(price ORDER BY timestamp DESC))[1] AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket;

-- Required unique index for CONCURRENTLY refreshes
CREATE UNIQUE INDEX idx_klines_1m_market_bucket ON klines_1m (market, bucket);

-- 1-HOUR K-LINES
CREATE MATERIALIZED VIEW klines_1h AS
SELECT
    market,
    date_trunc('hour', timestamp) AS bucket,
    (array_agg(price ORDER BY timestamp ASC))[1] AS open,
    max(price) AS high,
    min(price) AS low,
    (array_agg(price ORDER BY timestamp DESC))[1] AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket;

CREATE UNIQUE INDEX idx_klines_1h_market_bucket ON klines_1h (market, bucket);

-- 1-WEEK K-LINES
CREATE MATERIALIZED VIEW klines_1w AS
SELECT
    market,
    date_trunc('week', timestamp) AS bucket,
    (array_agg(price ORDER BY timestamp ASC))[1] AS open,
    max(price) AS high,
    min(price) AS low,
    (array_agg(price ORDER BY timestamp DESC))[1] AS close,
    sum(quantity) AS volume
FROM trades
GROUP BY market, bucket;

CREATE UNIQUE INDEX idx_klines_1w_market_bucket ON klines_1w (market, bucket);