# Sandbox image for arbitrary-language workflow nodes.
#
# We install every language runtime explicitly rather than relying on
# whatever happens to ship with the base image, so the image stays
# reproducible across cloudflare/sandbox SDK revisions.
#
#   - Python      →  python3 + python3-pip
#   - Bash        →  bash (base image but installed for safety)
#   - Node.js     →  nodejs + npm
#   - TypeScript  →  tsx (npm global)
#   - C           →  gcc + build-essential
#   - Go          →  golang-go
#   - Rust        →  rustc + cargo (apt — older but smaller than rustup)
#   - Java        →  openjdk-21-jdk-headless (full JDK for `java Main.java`)
#
# Image size note: this adds ~1.5 GB on top of the base image, which raises
# cold-start latency. Trim languages you don't need before deploying.
#
# The toolchains are installed one per layer rather than in a single RUN.
# As one layer the ~1.5 GB landed in a single blob, and pushing it to
# registry.cloudflare.com timed out ("timeout awaiting response headers")
# on every deploy. apt output is not byte-reproducible, so each retry
# produced a fresh digest and re-uploaded the whole thing. Per-toolchain
# layers keep each blob small enough to push, and a failure resumes at a
# layer boundary. Each layer runs its own update/clean pair because
# deleting the apt lists in a later layer would not reclaim the bytes.

FROM docker.io/cloudflare/sandbox:0.12.4

# Python, Bash, Node.js.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      bash \
      nodejs \
      npm \
    && rm -rf /var/lib/apt/lists/*

# C toolchain. Installed before Go and Rust, which both link through gcc.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

# Go.
RUN apt-get update && apt-get install -y --no-install-recommends \
      golang-go \
    && rm -rf /var/lib/apt/lists/*

# Rust.
RUN apt-get update && apt-get install -y --no-install-recommends \
      rustc \
    && rm -rf /var/lib/apt/lists/*

# Java. The largest of the toolchains, so it gets a layer to itself.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-21-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# TypeScript runner (no tsconfig required — `tsx` transpiles per file).
RUN npm install --global tsx

# Required by Cloudflare Sandbox for local-dev port exposure.
EXPOSE 8080
