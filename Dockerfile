FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# O estágio de CI não executa E2E. Copiar somente os arquivos usados por lint,
# testes unitários e Vite evita que arquivos transitórios/independentes entrem
# na camada do build do Docker.
COPY eslint.config.js tsconfig.json tsconfig.app.json vite.config.ts vitest.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY tests ./tests
RUN mkdir -p /app/reports \
    && (npm run lint -- --format json --output-file /app/reports/eslint.json \
      || (cat /app/reports/eslint.json && exit 1)) \
    && npm run typecheck \
    && npm run test:coverage \
    && npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
