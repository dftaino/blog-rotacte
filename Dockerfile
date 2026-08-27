# Build e execucao do blog (Astro SSR, adaptador Node standalone).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY scripts ./scripts
COPY src/lib ./src/lib
COPY arquivos ./arquivos
EXPOSE 4321
CMD ["sh", "-c", "node scripts/semear.mjs && node dist/server/entry.mjs"]
