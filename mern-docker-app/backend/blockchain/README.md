# Blockchain (Hardhat) for ModuCert

This folder contains a minimal Hardhat project that compiles and deploys the `CredentialRegistry` smart contract.

Quick commands:

1. Install dependencies

```bash
cd backend/blockchain
npm install
```

2. Compile

```bash
npx hardhat compile
```

3. Deploy (to local node defined by `PROVIDER_URL` in your env)

```bash
PROVIDER_URL=http://127.0.0.1:8545 PRIVATE_KEY=0x... node scripts/deploy.js
```

The deploy script writes `deployed-address.json` in this folder with the contract address.

Note: For production you should integrate with the National Blockchain Framework (NBF) deployment processes and add access control to the contract.
