FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json tsconfig.base.json ./
COPY services ./services
COPY libs ./libs
RUN npm install
RUN npm run build
CMD ["node", "dist/services/token-lifecycle/main.js"]
