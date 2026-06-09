# syntax=docker/dockerfile:1.7
FROM node:22-slim

# Install dependencies for Prisma and Puppeteer (Chromium)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    chromium \
    ca-certificates \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download Prisma engines from a mirror when the default CDN is unreachable.
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR} \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,id=npm-cache,target=/root/.npm,sharing=locked \
    for attempt in 1 2 3; do \
      npm ci --prefer-offline --no-audit --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000 && break; \
      if [ "$attempt" = "3" ]; then exit 1; fi; \
      echo "npm ci failed, retrying in 10s..."; \
      sleep 10; \
    done

# Copy source code
COPY . .

# Generate Prisma client if prisma directory exists
RUN if [ -d "./prisma" ]; then npx prisma generate || echo "Prisma generate failed due to network issues, will retry at runtime"; fi

# The port will be set via environment variable
EXPOSE 3000

# Let Puppeteer know where Chromium is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["npm", "start"]
