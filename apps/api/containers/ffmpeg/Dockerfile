FROM node:22-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY server.mjs .

EXPOSE 8080
CMD ["node", "server.mjs"]
