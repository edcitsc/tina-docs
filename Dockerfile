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
# Explicitly set NODE_ENV=development to ensure devDependencies (e.g.
# @tinacms/cli) are installed — they are needed for the build stage.
ENV NODE_ENV=development
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

# NEXT_PUBLIC_SITE_URL is baked into the TinaCMS admin SPA and the generated
# client for server-side data fetching. Pass the real deployed URL as a
# --build-arg for production images so both SSR and admin resolve correctly.
# Default to localhost for local/dev Docker builds.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Placeholder values for modules that validate env at import time during build.
# The build never opens real connections; the Container App injects real values.
ENV MONGODB_URI=mongodb://placeholder:placeholder@127.0.0.1:27017/placeholder
ENV ADO_ORG_URL=https://placeholder.invalid
ENV ADO_PROJECT=placeholder
ENV ADO_REPO_ID=placeholder
ENV ADO_PAT=placeholder

# Enable standalone output mode for Docker deployment
ENV STANDALONE_OUTPUT=true

# Build step 1: TinaCMS build (generates schema, admin SPA, etc.)
# database.ts eagerly connects to MongoDB when USE_LOCAL_DB=false. Override
# to true for the build step only. The admin SPA detects local mode via the
# auth provider (USE_LOCAL_AUTH), not the DB flag — auth is correctly false.
#
# --no-client-build-cache: omit the filesystem response cache from the
# generated client. Without this, the SSR HTTP client caches GraphQL
# responses to disk forever (no TTL, no invalidation), so admin edits do
# not appear on the public site until the container restarts.
RUN TINA_PUBLIC_USE_LOCAL_DB=true pnpm exec tinacms build --skip-indexing --no-client-build-cache

# Build step 2: Next.js build
# Pages are server-rendered dynamically (no CMS during build), so pagefind
# cannot index content here. Skip it — admin search uses MiniSearch at
# runtime, and pagefind can be run post-deploy if static indexing is needed.
RUN pnpm exec next build

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
# tina-lock.json is needed by the /api/reindex endpoint to bootstrap the
# database schema on first deploy.
COPY --from=build --chown=nextjs:nodejs /app/tina/tina-lock.json ./tina/tina-lock.json

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
