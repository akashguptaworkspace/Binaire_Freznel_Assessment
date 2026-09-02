# Zero-build Node service. No frontend here — this image is API-only.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/
EXPOSE 4000
CMD ["node", "src/index.js"]
