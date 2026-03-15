FROM docker.io/cloudflare/sandbox:0.7.17

# Install DuckDB CLI
RUN apt-get update -qq && \
    apt-get install -y -qq wget unzip > /dev/null 2>&1 && \
    wget -q https://github.com/duckdb/duckdb/releases/latest/download/duckdb_cli-linux-amd64.zip -O /tmp/duckdb.zip && \
    unzip -o /tmp/duckdb.zip -d /usr/local/bin/ > /dev/null 2>&1 && \
    rm /tmp/duckdb.zip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Pre-install httpfs extension
RUN duckdb -c "INSTALL httpfs;"
