# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the self-hosted TinaDocs app.
#
# - deps:    install pnpm + lockfile-pinned dependencies
# - build:   tinacms build + next build + pagefind (produces .next/standalone + pagefind index)
# - runtime: alpine + node, copies standalone output + static + public + pagefind
#
# The result is a single-process Node.js image suitable for Azure Container
# Apps (or any other Linux container host). PORT and HOSTNAME are set so it
# binds to 0.0.0.0:3000 by default; override via container env if needed.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=9.15.2

# ---------- deps ----------
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:${NODE_VERSION} AS build
ARG PNPM_VERSION
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# TINA_PUBLIC_* values are baked into the admin SPA bundle by `tinacms build`
# (the admin reads them at module load, not at request time). Setting them to
# `false` here matches the production runtime config and stops the admin from
# silently bypassing Entra/Cosmos because of an inherited dev default.
ENV TINA_PUBLIC_USE_LOCAL_DB=false
ENV TINA_PUBLIC_USE_LOCAL_AUTH=false
ENV NEXT_TELEMETRY_DISABLED=1

# Placeholder values for modules that validate env at import time during build.
# The build never opens real connections; the Container App injects real values.
ENV MONGODB_URI=mongodb://placeholder:placeholder@127.0.0.1:27017/placeholder
ENV ADO_ORG_URL=https://placeholder.invalid
ENV ADO_PROJECT=placeholder
ENV ADO_REPO_ID=placeholder
ENV ADO_PAT=placeholder

# Enable standalone output mode for Docker deployment
ENV STANDALONE_OUTPUT=true

# Build: TinaCMS → Next.js → Pagefind (generates static search index)
# The `postbuild` script in package.json runs pagefind automatically.
RUN pnpm build

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone output. `server.js` lives at the root of the standalone tree and
# expects `.next/static` and `public` next to it.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
