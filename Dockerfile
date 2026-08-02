# Multi-stage Dockerfile for Cloud Run Deployment

# Stage 1: Build the Vite frontend and Express server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies including devDependencies required for build
RUN npm ci

# Copy full application code
COPY . .

# Run application build (Vite frontend + Express backend bundle via esbuild)
RUN npm run build

# Stage 2: Production runner container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package descriptors and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built distribution assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Launch server
CMD ["node", "dist/server.cjs"]
