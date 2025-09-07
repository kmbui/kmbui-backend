FROM oven/bun:slim@sha256:9759e7229cd7c2939d960420bdb8dc5dc3b3dda0285f8601226606e5fd97dfdf AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

FROM debian:bookworm-slim@sha256:b1a741487078b369e78119849663d7f1a5341ef2768798f7b7406c4240f86aef AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server .

CMD ["./server"]
