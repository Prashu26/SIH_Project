# Backend Setup – LegitDoc-Style Credential Issuance

This backend issues blockchain-anchored certificates, batches them into Merkle trees, and exposes verification endpoints that accept PDF uploads. Use this guide to configure the required services before running the server.

## Environment variables

Copy `.env.example` to `.env` and adjust the values. Key settings:

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port for the Express server (default `8080`). |
| `MONGODB_URI` | MongoDB connection string for persistence. |
| `JWT_SECRET`, `JWT_EXPIRE` | Credentials for signing access tokens. |
| `POLYGON_RPC_URL` | Polygon RPC endpoint (Amoy/Mumbai for SIH demos). |
| `CONTRACT_ADDRESS` | Deployed `LegitAnchor` contract address. |
| `ISSUER_PRIVATE_KEY` | Hex-encoded private key for the issuer wallet (store securely / use KMS in production). |
| `ISSUER_WALLET_ADDRESS` | Public address of the issuer wallet (used for auditing). |
| `USE_IPFS` | Set to `true` to push generated PDFs to IPFS. |
| `IPFS_ENDPOINT` | IPFS HTTP API endpoint when `USE_IPFS=true`. |
| `VERIFICATION_BASE_URL` | Frontend URL used inside generated certificates/QR links. |
| `API_BASE_URL` | Base URL for backend API links embedded in artifacts. |
| `LOG_LEVEL` | Winston log level (`info`, `debug`, etc.). |

## Prerequisites

1. **MongoDB** – Running locally or via managed service. Update `MONGODB_URI` accordingly.
2. **Polygon RPC** – Use Polygon Amoy/Mumbai testnet for SIH demos. You can obtain a free RPC URL from Alchemy, Infura, or QuickNode.
3. **LegitAnchor contract** – Deploy the smart contract and copy the resulting address into `CONTRACT_ADDRESS`.
4. **Issuer wallet** – Fund the issuer wallet with testnet MATIC to cover anchoring transactions. Store its private key securely.
5. **IPFS (optional)** – If `USE_IPFS=true`, run a local IPFS daemon or use a pinning service, and set `IPFS_ENDPOINT`.

## Running locally

```bash
# from backend/
npm install
npm run dev
```

The server starts on `http://localhost:8080` and exposes:
- `POST /api/issuer/upload` – CSV-based batch issuance.
- `GET /api/issuer/batches` – List batches for the logged-in institute.
- `POST /api/verify/upload` – Verifier uploads a PDF to validate.
- `GET /api/verify/:certificateId` – Fetch certificate status by ID.

## Deployment notes

- Never commit real private keys. Use environment-specific secrets or a KMS and inject them at runtime.
- Enable HTTPS termination at the load balancer or reverse proxy layer.
- Configure process supervisors (PM2/systemd) and structured logging to capture `info` and `error` logs.
- Back up MongoDB and monitor Polygon anchoring transactions for failures.
