# Stage: deps — production dependencies only
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# Stage: builder — full install + compile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts --no-audit --no-fund
COPY . .
RUN node ace build

# Stage: runner — minimal production image
FROM node:24-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 adonisjs && adduser -u 1001 -G adonisjs -s /bin/sh -D adonisjs

COPY --from=builder --chown=1001:1001 /app/build ./build
COPY --from=deps    --chown=1001:1001 /app/node_modules ./node_modules
COPY --from=builder --chown=1001:1001 /app/package.json ./package.json

USER adonisjs

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

CMD ["node", "build/bin/server.js"]
