# Multi-stage, BuildKit-free Dockerfile for Railway
# Builds on standard Docker (no --mount or other BuildKit features).

ARG OPENCLAW_BUNDLED_PLUGIN_DIR=extensions
ARG OPENCLAW_EXTENSIONS=""

# ---------- Stage: deps ----------
FROM docker.io/library/node:24-bookworm as deps
WORKDIR /app

# Copy only the manifest + workspace metadata needed for install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc openclaw.mjs ./
COPY packages ./packages
COPY ${OPENCLAW_BUNDLED_PLUGIN_DIR} ./${OPENCLAW_BUNDLED_PLUGIN_DIR}
COPY patches ./patches
COPY scripts ./scripts

RUN corepack enable && \
    pnpm install --frozen-lockfile

# ---------- Stage: build ----------
FROM docker.io/library/node:24-bookworm as build
WORKDIR /app

COPY --from=deps /app /app

# Copy the full source tree
COPY . .

# Run build (ensure root package.json "build" runs the workspace builds)
RUN corepack enable && pnpm run build

# Prune devDependencies in build stage
RUN CI=true pnpm prune --prod --config.offline=false || true

# ---------- Stage: runtime ----------
FROM docker.io/library/node:24-bookworm-slim as runtime
WORKDIR /app

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl git hostname lsof openssl procps python3 tini && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml ./
COPY --from=build --chown=node:node /app/patches ./patches
COPY --from=build --chown=node:node /app/openclaw.mjs ./
COPY --from=build --chown=node:node /app/${OPENCLAW_BUNDLED_PLUGIN_DIR} ./${OPENCLAW_BUNDLED_PLUGIN_DIR}
COPY --from=build --chown=node:node /app/skills ./skills
COPY --from=build --chown=node:node /app/docs ./docs
COPY --from=build --chown=node:node /app/qa ./qa

ENV COREPACK_HOME=/usr/local/share/corepack
RUN install -d -m 0755 "$COREPACK_HOME" && corepack enable && chmod -R a+rX "$COREPACK_HOME"

RUN ln -sf /app/openclaw.mjs /usr/local/bin/openclaw && chmod 755 /app/openclaw.mjs

RUN install -d -m 0755 -o node -g node /home/node/.config && \
    install -d -m 0700 -o node -g node \
      /home/node/.openclaw \
      /home/node/.openclaw/workspace \
      /home/node/.config/openclaw

ENV NODE_ENV=production
ENV OPENCLAW_PREFER_PNPM=1

EXPOSE 18789
USER node
ENTRYPOINT ["tini", "-s", "--"]
CMD ["sh", "-c", "node openclaw.mjs gateway --bind lan --port ${PORT:-18789}"]
