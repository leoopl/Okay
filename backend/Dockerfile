# Build stage
FROM node:20.18-slim AS build

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy app source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20.18-slim

# Create app directory
WORKDIR /usr/src/app

# Install production dependencies only
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --production --frozen-lockfile

# Copy built application
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]