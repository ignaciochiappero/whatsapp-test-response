# Dockerfile para el backend
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    chromium-chromedriver

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar schema y migraciones de Prisma
COPY prisma ./prisma/

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente
COPY server.js ./
COPY main.js ./
COPY .env ./

# Crear directorio para sesiones de WhatsApp con permisos correctos
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache && \
    chown -R node:node /app

# Cambiar a usuario no-root
USER node

# Exponer puerto
EXPOSE 3001

# Script de inicio que ejecuta migraciones y luego inicia el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
