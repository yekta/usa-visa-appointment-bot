# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Declare build arguments for multi-arch support (BuildKit sets TARGETPLATFORM automatically)
ARG TARGETPLATFORM

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

ENV IS_PROD=true

# Tell Puppeteer not to download Chromium because we’re installing our own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install Chromium for both ARM and x86
RUN apt-get update && \
  apt-get install -y chromium \
  # Only minimal dependencies needed
  ca-certificates \
  fonts-liberation \
  libasound2 && \
  rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install typescript (if needed by your project)
RUN npm install typescript

# Install project dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the application
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "dist/main.js" ]
