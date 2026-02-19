FROM node:20-slim

# Install git and other basic utilities
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set git configuration for the agent
RUN git config --global user.email "closedai-agent@example.com" && \
    git config --global user.name "ClosedAI Agent"

# Default command to start the bot in polling mode
# You can override this in docker-compose or docker run
CMD ["npm", "run", "start:poll"]
