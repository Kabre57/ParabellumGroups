FROM node:22-slim

# Install system deps for Prisma and Puppeteer/Chromium
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      openssl \
      chromium \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libnspr4 \
      libnss3 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxi6 \
      libxrandr2 \
      libxrender1 \
      libxss1 \
      libxtst6 \
      libglib2.0-0 \
      libdrm2 \
      libgbm1 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      libcups2 \
      libxkbcommon0 \
      libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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

CMD ["npm", "start"]
