FROM node:22-slim

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

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
RUN if [ -d "./prisma" ]; then npx prisma generate; fi

# The port will be set via environment variable
EXPOSE 3000

CMD ["npm", "start"]
