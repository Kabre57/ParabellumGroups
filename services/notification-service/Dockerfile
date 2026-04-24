FROM node:22-slim

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Download Prisma engines from a mirror when the default CDN is unreachable.
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR} \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client if prisma directory exists
RUN if [ -d "./prisma" ]; then npx prisma generate || echo "Prisma generate failed due to network issues, will retry at runtime"; fi

# The port will be set via environment variable
EXPOSE 3000

CMD ["npm", "start"]
