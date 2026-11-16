# Fase 24 — Imagem da API (Cloud Run na Fase 27, D23). Construída a partir da raiz do repositório:
#   docker build -f apps/api/Dockerfile .
FROM node:22-slim AS construcao
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/dominio/package.json packages/dominio/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @medicore/api --include-workspace-root=false
COPY packages/dominio packages/dominio
COPY apps/api apps/api
RUN npm run build -w @medicore/api

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/dominio/package.json packages/dominio/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @medicore/api --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=construcao /app/apps/api/dist apps/api/dist
COPY apps/api/drizzle apps/api/drizzle
USER node
EXPOSE 3000
# Migra (idempotente) e sobe a API.
CMD ["sh", "-c", "node apps/api/dist/migrar.js && node apps/api/dist/principal.js"]
