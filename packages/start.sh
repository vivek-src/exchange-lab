#!/bin/bash

echo "Starting API"
(cd api && node dist/index.js) &

echo "Starting DB Worker"
(cd db && node dist/workers/ledgerWorker.js) &

echo "Starting Engine"
(cd engine && node dist/index.js) &

echo "Starting WebSocket Server"
(cd ws && node dist/index.js) &

echo "Starting Web Server"
(cd web && npm run dev) &

wait