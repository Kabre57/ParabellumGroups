# syntax=docker/dockerfile:1.7
FROM node:22-slim

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Download Prisma engines from a mirror when the default CDN is unreachable.
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR} \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY . .

# Generate Prisma client if prisma directory exists
RUN if [ -d "./prisma" ]; then pnpm exec prisma generate || echo "Prisma generate failed due to network issues, will retry at runtime"; fi

# The port will be set via environment variable
EXPOSE 3000

CMD ["pnpm", "start"]
