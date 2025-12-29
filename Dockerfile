FROM oven/bun:1.3.5-alpine@sha256:7156fcc0cee0194d390bfaf7f0eeda9a5e383e70cc90f31aad3a2440a033d7dc AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

FROM alpine:3.23@sha256:865b95f46d98cf867a156fe4a135ad3fe50d2056aa3f25ed31662dff6da4eb62 AS runner

RUN apk add --no-cache libstdc++

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server .

CMD ["./server"]
