FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 8000

# Start the server
CMD ["npm", "start"]
