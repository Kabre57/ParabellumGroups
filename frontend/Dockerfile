# syntax=docker/dockerfile:1.7
# Étape 1 : Construction
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Installation des dépendances
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prefer-offline

# Copie du reste du code source
COPY . .

# The Next.js rewrite runs inside the frontend container in production.
ARG API_GATEWAY_URL=http://api-gateway:3001
ENV API_GATEWAY_URL=${API_GATEWAY_URL}

# Construction de l'application Next.js
RUN pnpm run build

# Étape 2 : Exécution
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Crée un utilisateur non-root pour plus de sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copie les fichiers essentiels depuis le builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# COPIE AUSSI CES FICHIERS ESSENTIELS :
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# Passe à l'utilisateur non-root
USER nextjs

EXPOSE 3000

# Lance directement le binaire Next.js dans l’image d’exécution.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
