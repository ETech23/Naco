# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8091

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start the application
CMD ["npm", "start"]

---

# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8091:8091"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/naco
      - JWT_SECRET=your-super-secret-jwt-key-change-in-production
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=naco

volumes:
  mongo_data:

---

# docker-compose.dev.yml (for development)
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8091:8091"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/naco
      - JWT_SECRET=dev-secret-key
    depends_on:
      - mongo
    volumes:
      - .:/app
      - /app/node_modules
      - ./uploads:/app/uploads
    command: npm run dev

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=naco

volumes:
  mongo_data:

---

# Docker Commands:

# Build and run with Docker Compose
docker-compose up -d

# Development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild after changes
docker-compose down
docker-compose build --no-cache
docker-compose up -d
