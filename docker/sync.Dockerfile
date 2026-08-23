# Sync container for self-hosted static mode (P1-15): elog → validate →
# build → atomic release switch into the shared site volume.
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
CMD ["sh", "scripts/sync-loop.sh"]
