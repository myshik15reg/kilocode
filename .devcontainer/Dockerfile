# Kilo Code Development Container
# Based on flake.nix dependencies for standardized development environment

# Use official Node.js image matching .nvmrc version
FROM node:20.20.0-bullseye

# Install system dependencies (matching flake.nix packages) + Docker CLI (Option B)
# NOTE: We intentionally install only the client tooling (no daemon) and rely on
# `/var/run/docker.sock` bind-mount from the Docker Desktop host.
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    libnotify-bin \
    build-essential \
    python3 \
    ca-certificates \
    gnupg \
    lsb-release; \
  install -m 0755 -d /etc/apt/keyrings; \
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg; \
  chmod a+r /etc/apt/keyrings/docker.gpg; \
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    docker-ce-cli \
    docker-buildx-plugin \
    docker-compose-plugin; \
  rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm (matching package.json version)
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

# Set working directory
WORKDIR /workspace

# Set environment variables
ENV NODE_ENV=development
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Create pnpm directories
RUN mkdir -p /root/.local/share/pnpm

# Default command
CMD ["bash"]
