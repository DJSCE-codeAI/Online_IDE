FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io python3 gcc g++ \
  && npm install --global esbuild@0.25.0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.js .
EXPOSE 4000
CMD ["node", "server.js"]