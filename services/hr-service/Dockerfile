FROM node:22-slim

# Install openssl for Prisma and postgresql-client for pg_isready
RUN apt-get update -y && apt-get install -y openssl postgresql-client

WORKDIR /app

# Download Prisma engines from a mirror when the default CDN is unreachable.
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR} \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client if prisma directory exists
RUN if [ -d "./prisma" ]; then npx prisma generate || echo "Prisma generate failed due to network issues, will retry at runtime"; fi

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# The port will be set via environment variable
EXPOSE 4009

ENTRYPOINT ["docker-entrypoint.sh"]
