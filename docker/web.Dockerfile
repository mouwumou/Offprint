# Static-mode image: build dist/ with Node, serve with Caddy.
# Build:  docker build -f docker/web.Dockerfile -t offprint-web .
# Run:    docker run --rm -p 8080:80 offprint-web

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:static

FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
