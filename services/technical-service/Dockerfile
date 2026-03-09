FROM node:22-slim

# Install dependencies for Prisma and Puppeteer (Chromium)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    chromium \
    ca-certificates \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client if prisma directory exists
RUN if [ -d "./prisma" ]; then npx prisma generate; fi

# The port will be set via environment variable
EXPOSE 3000

# Let Puppeteer know where Chromium is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["npm", "start"]
