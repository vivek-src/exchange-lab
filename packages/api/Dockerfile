FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/package*.json ./packages/
COPY packages ./packages
WORKDIR /app/packages
RUN npm ci
RUN npm run db:generate --workspace=db || true
RUN npm run build --workspace=shared || true
RUN npm run build --workspace=api || true

FROM node:22-alpine AS deps
WORKDIR /app
COPY packages/package*.json ./packages/
COPY packages ./packages
WORKDIR /app/packages
RUN npm ci --omit=dev
RUN npm run db:generate --workspace=db || true

FROM node:22-alpine AS runner
WORKDIR /app/packages/api
ENV NODE_ENV=production

COPY --from=deps /app/packages/node_modules /app/packages/node_modules
COPY --from=builder /app/packages/db /app/packages/db
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/packages/api /app/packages/api

CMD ["node", "dist/index.js"]
