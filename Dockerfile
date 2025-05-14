# Use official Node.js LTS base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose app port
EXPOSE 3001

# Start the Fastify server
CMD ["node", "server.js"]
