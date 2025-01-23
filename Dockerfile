FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy TypeScript config
COPY tsconfig.json .

# Copy source files
COPY src/ src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose the port specified by the PORT environment variable
EXPOSE ${PORT}
