# Use Node.js LTS Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S designdraw -u 1001

# Copy application files
COPY --chown=designdraw:nodejs . .

# Switch to non-root user
USER designdraw

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["npm", "start"]
