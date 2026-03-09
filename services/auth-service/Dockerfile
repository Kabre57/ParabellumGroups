FROM node:22-slim

# Install openssl for Prisma and postgresql-client for pg_isready
RUN apt-get update -y && apt-get install -y openssl postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client if prisma directory exists
RUN if [ -d "./prisma" ]; then npx prisma generate; fi

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# The port will be set via environment variable
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
