FROM oven/bun:latest
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock* ./
COPY prisma ./prisma/
RUN bun install
RUN bun x prisma generate
COPY . .
EXPOSE 5050
CMD ["node", "dist/main"]
