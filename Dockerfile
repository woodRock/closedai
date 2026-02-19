FROM node:20-slim

# Install git and other basic utilities
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-privileged user
RUN groupadd -r closedai && useradd -r -g closedai closedai

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Change ownership of /app to the non-privileged user
RUN chown -R closedai:closedai /app

# Switch to the non-privileged user
USER closedai

# Set git configuration for the agent
RUN git config --global user.email "closedai-agent@example.com" && \
    git config --global user.name "ClosedAI Agent"

# Default command to start the bot in polling mode
CMD ["npm", "run", "start:poll"]
