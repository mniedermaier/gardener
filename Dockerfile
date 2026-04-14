# Stage 1: Build frontend
FROM node:25-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build backend
FROM node:25-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/ .
RUN npx tsc

# Stage 3: Production
FROM node:25-alpine
RUN apk add --no-cache nginx

# Copy frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY --from=frontend-build /app/public/locales /usr/share/nginx/html/locales
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy backend
WORKDIR /app
COPY --from=backend-build /app/backend/dist ./backend/
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/

# Data volume for SQLite
RUN mkdir -p /app/data
VOLUME /app/data

ENV DB_PATH=/app/data/gardener.db
ENV PORT=3001

EXPOSE 80

CMD sh -c "nginx && node backend/index.js"
