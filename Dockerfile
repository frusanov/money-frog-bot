FROM oven/bun:1 AS base

WORKDIR /app
COPY . .
RUN bun install -p
RUN rm .dockerignore

FROM node:lts-alpine AS runner

WORKDIR /app

COPY --from=base /app .

CMD [ "npm", "run", "start" ]
