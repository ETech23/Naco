FROM alpine:latest

# Install dependencies
RUN apk add --no-cache \
    ca-certificates \
    unzip \
    wget \
    zip \
    zlib-dev

# Download and install PocketBase
ARG PB_VERSION=0.20.0
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy your data and migrations
COPY pb_data ./pb_data
COPY pb_migrations ./pb_migrations

# Expose port
EXPOSE 8080

# Start PocketBase
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb_data"]
