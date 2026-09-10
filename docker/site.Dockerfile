# Server-mode image: SSR via the node
# adapter, reading content from a mounted volume at request time. Single
# stage on purpose: /api/sync spawns the sync CLI inside this image,
# which needs the full toolchain (tsx, elog).
# Build:  docker build -f docker/site.Dockerfile -t offprint-site .
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
# Astro bakes `site` (canonical/hreflang/feeds/sitemap origins) at build
# time — it cannot be changed by runtime env, so it must arrive as a build
# arg (compose passes it from .env).
ARG SITE_URL=https://example.com
ENV SITE_URL=$SITE_URL
RUN pnpm build:server

ENV HOST=0.0.0.0 PORT=4321 RUNTIME_MODE=server CONTENT_STORE=fs CONTENT_DIR=/content
EXPOSE 4321
ENTRYPOINT ["sh", "docker/site-entrypoint.sh"]
CMD ["node", "dist/server/entry.mjs"]
