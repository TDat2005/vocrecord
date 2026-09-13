FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source
COPY server/src ./src



# Expose port
EXPOSE 3000

CMD ["node", "src/index.js"]
