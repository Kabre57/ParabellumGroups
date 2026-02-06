# Étape 1 : Construction
FROM node:22-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste du code source
COPY . .

# Construction de l'application Next.js
RUN npm run build

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

# Utilise next start au lieu de npm start pour de meilleures performances
CMD ["npx", "next", "start"]