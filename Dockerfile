# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Declare build arguments for multi-arch support (BuildKit sets TARGETPLATFORM automatically)
ARG TARGETPLATFORM

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Tell Puppeteer not to download Chromium because we’re installing our own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies and install the appropriate browser based on architecture
RUN apt-get update && \
  apt-get install -y gnupg wget && \
  if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
  echo "Installing Google Chrome Stable for amd64" && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
  apt-get update && \
  apt-get install -y google-chrome-stable --no-install-recommends; \
  else \
  echo "Installing Chromium for non-amd64 (e.g. arm)" && \
  apt-get update && \
  apt-get install -y chromium --no-install-recommends && \
  # Create a symlink so that Puppeteer finds the browser at /usr/bin/google-chrome-stable
  ln -s /usr/bin/chromium /usr/bin/google-chrome-stable; \
  fi && \
  rm -rf /var/lib/apt/lists/*

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
