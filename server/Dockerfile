FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Cài thư viện (chỉ dependencies chạy thật, bỏ devDependencies)
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Mã nguồn backend
COPY server/src ./src

# Chạy bằng user không phải root
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
