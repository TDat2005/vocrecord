# Debian slim thay vì Alpine: onnxruntime-node (chạy mô hình tìm kiếm AI) cần glibc, không chạy trên musl.
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
# Không tải bản CUDA của onnxruntime (chỉ dùng CPU).
ENV ONNXRUNTIME_NODE_INSTALL=skip

# Cài thư viện (chỉ dependencies chạy thật, bỏ devDependencies); bỏ binary onnxruntime cho macOS/Windows (~220MB)
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force \
    && find node_modules/onnxruntime-node/bin -mindepth 2 -maxdepth 2 -type d ! -name linux -exec rm -rf {} +

# Mã nguồn backend
COPY server/src ./src

# Mô hình embedding tải về lần đầu được lưu ở đây (gắn volume để không tải lại khi tạo container mới)
ENV AI_MODEL_CACHE=/app/.cache/models
RUN mkdir -p /app/.cache/models && chown -R node:node /app/.cache

# Chạy bằng user không phải root
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
