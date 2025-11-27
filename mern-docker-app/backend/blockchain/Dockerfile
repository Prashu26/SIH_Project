FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8545
# Default command runs a local Hardhat node
CMD ["npx", "hardhat", "node"]
