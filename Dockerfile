FROM node:20-alpine 
WORKDIR /app 
COPY backend/package*.json ./ 
COPY backend/prisma ./prisma 
RUN npm install 
COPY backend/ . 
RUN npx tsc -p tsconfig.json 
EXPOSE 8787 
CMD ["node", "dist/server.js"]
