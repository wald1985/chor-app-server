FROM node:20-slim

# Установка postgresql-client и openssl (для Prisma)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем файлы зависимостей и схему prisma
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm install

# Генерируем Prisma
RUN npx prisma generate

# Копируем весь остальной код
COPY . .

# Собираем проект (если это TS / NestJS / Vite и т.д.)
RUN npm run build

EXPOSE 5050

CMD ["node", "dist/main"]