FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ... (omitting lines for brevity, context will handle match)

# Provide read/write access to the database directory
RUN chmod -R 777 ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
# Initialize DB if needed and start
CMD ["sh", "-c", "npx prisma migrate deploy || npx prisma db push && node server.js"]
