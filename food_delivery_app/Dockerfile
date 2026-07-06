# Use Node.js 18 LTS
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy server code and web directory
COPY server-production.js ./
COPY web/ ./web/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the server. Provide Firebase credentials through runtime secrets/env.
CMD ["node", "server-production.js"]
