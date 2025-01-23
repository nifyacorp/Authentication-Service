FROM node:18-alpine

# Install Cloud SQL Auth proxy dependencies
RUN apk add --no-cache curl

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

# Download and install Cloud SQL Auth proxy
RUN curl -o cloud_sql_proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.1/cloud-sql-proxy.linux.amd64
RUN chmod +x cloud_sql_proxy

# Expose port
EXPOSE 3000

# Start Cloud SQL Auth proxy and the application
CMD ["./cloud_sql_proxy", "--unix-socket /cloudsql", \
     "delta-entity-447812-p2:us-central1:auth-service-db" & npm start]
# Start the server
CMD ["npm", "start"]