# Build giao diện React rồi phục vụ bằng Nginx (Nginx chuyển /api và /socket.io sang container api)
# Build context: thư mục gốc repo  ->  docker build -f DiaNhac/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
COPY DiaNhac/package*.json ./
# transformers.js kéo theo onnxruntime-node; frontend chỉ dùng bản WebAssembly nên không cần tải bản CUDA.
ENV ONNXRUNTIME_NODE_INSTALL=skip
RUN npm ci
COPY DiaNhac/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
