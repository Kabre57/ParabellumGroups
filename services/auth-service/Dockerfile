FROM node:22-slim

# Install openssl for Prisma and postgresql-client for pg_isready
RUN apt-get update -y && apt-get install -y openssl postgresql-client

WORKDIR /app

# Download Prisma engines from a mirror when the default CDN is unreachable.
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR} \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Configure npm for better network reliability
RUN npm config set fetch-timeout 60000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Try to generate Prisma client during build. In restricted networks the Prisma
# binary CDN can be unavailable; the runtime entrypoint has a SQL fallback for
# local auth bootstrap in that case.
RUN npx prisma generate --schema=prisma/schema.prisma || (echo "Prisma generate failed; auth-service will use SQL fallback if needed" && touch /app/.prisma-generate-failed)

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# The port will be set via environment variable
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
