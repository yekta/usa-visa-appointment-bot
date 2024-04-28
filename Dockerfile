# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
# Puppeteer dependencies
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  libpango-1.0-0 \
  libgbm-dev \
  libxss1 \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN groupadd -r nodeuser && useradd -r -g nodeuser -G audio,video nodeuser \
  && mkdir -p /home/nodeuser/Downloads \
  && chown -R nodeuser:nodeuser /home/nodeuser \
  && chown -R nodeuser:nodeuser /usr/src/app

# Run everything after as non-root user
USER nodeuser

# Install typescript
RUN npm install typescript

# Install project dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the application
RUN npm run build

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "dist/main.js" ]