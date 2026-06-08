# Multi-stage build: build frontend, build backend, run backend serving both.

# --- Frontend build ---
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Backend build ---
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-build /app/backend/dist ./dist
# Static frontend assets (served by a reverse proxy or static handler).
COPY --from=frontend /app/frontend/dist ./public
EXPOSE 4000
CMD ["node", "dist/server.js"]