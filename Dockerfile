# Bake-worker deployment image — canonical copy lives at bake-worker/Dockerfile.
# Elestio's CI/CD pipeline builds the repo-root Dockerfile, and the build needs
# repo-root context anyway (shared src/lib/bake + public models). Keep in sync.
FROM node:22-slim

WORKDIR /app

COPY bake-worker/package*.json ./
COPY bake-worker/scripts ./scripts
COPY bake-worker/src ./src
COPY src/lib/bake /app/shared/bake
RUN npm ci --omit=dev

COPY public/models/characters /app/models
ENV MODELS_DIR=/app/models

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["npm", "start"]
