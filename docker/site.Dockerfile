# Server-mode image (ADR-003 optional runtime, P2-2): SSR via the node
# adapter, reading content from a mounted volume at request time. Single
# stage on purpose: /api/sync (P2-3) spawns the sync CLI inside this image,
# which needs the full toolchain (tsx, elog).
# Build:  docker build -f docker/site.Dockerfile -t offprint-site .
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:server

ENV HOST=0.0.0.0 PORT=4321 RUNTIME_MODE=server CONTENT_STORE=fs CONTENT_DIR=/content
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
