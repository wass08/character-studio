FROM node:22-slim

# /worker, NOT /app: Elestio's generated pipeline compose volume-mounts the
# repo's root ./src over /app/src (a generic hot-reload assumption), which
# would shadow the worker's code. Living outside /app makes the image immune.
WORKDIR /worker

COPY bake-worker/package*.json ./
COPY bake-worker/scripts ./scripts
COPY bake-worker/src ./src
COPY src/lib/bake ./shared/bake
RUN npm ci --omit=dev

COPY public/models/characters /worker/models
ENV MODELS_DIR=/worker/models

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["npm", "start"]
