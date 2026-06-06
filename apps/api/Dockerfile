# Sandbox image for arbitrary-language workflow nodes.
#
# Base image already ships Python 3.11, Node.js 20, Bash, and common Unix
# tools. We layer on the toolchains needed by the other sandbox nodes:
#
#   - TypeScript  →  tsx (npm global)
#   - C           →  gcc + build-essential
#   - Go          →  golang-go
#   - Rust        →  rustc + cargo (apt — older but smaller than rustup)
#   - Java        →  openjdk-21-jdk-headless (full JDK for `java Main.java`)
#
# Image size note: this adds ~1.3 GB on top of the base image, which raises
# cold-start latency. Trim languages you don't need before deploying.

FROM docker.io/cloudflare/sandbox:0.7.0

# System toolchains — single layer, cache cleaned to keep the image small.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      golang-go \
      rustc \
      openjdk-21-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# TypeScript runner (no tsconfig required — `tsx` transpiles per file).
RUN npm install --global tsx

# Required by Cloudflare Sandbox for local-dev port exposure.
EXPOSE 8080
