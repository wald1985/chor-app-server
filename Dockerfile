FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# prisma.config.ts resolves DATABASE_URL eagerly, even for `prisma generate`
# (which never actually connects to a DB) - a placeholder keeps the build
# self-contained. The real value is supplied at container runtime and
# overrides this default.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 5050

CMD ["node", "dist/main"]
