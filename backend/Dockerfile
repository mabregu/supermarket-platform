# Imagen del backend NestJS para deploy (Render / Fly.io / Railway / cualquier host).
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (cache de capas).
# NO definir NODE_ENV=production aca: `nest build` necesita las devDependencies.
COPY package*.json ./
RUN npm ci

# Compilar
COPY . .
RUN npm run build

# Runtime
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "dist/main"]
