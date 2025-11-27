const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

function loadArtifact() {
  const artifactPath = path.join(__dirname, '..', 'blockchain', 'artifacts', 'contracts', 'CredentialRegistry.sol', 'CredentialRegistry.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`ABI artifact not found at ${artifactPath}. Compile the Hardhat project first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath));
}

function getProviderAndSigner() {
  const providerUrl = process.env.PROVIDER_URL || 'http://127.0.0.1:8545';
  const privateKey = process.env.PRIVATE_KEY;
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  if (!privateKey) return { provider };
  const wallet = new ethers.Wallet(privateKey, provider);
  return { provider, signer: wallet };
}

function getContract() {
  const artifact = loadArtifact();
  const abi = artifact.abi;
  let address = process.env.CONTRACT_ADDRESS;
  if (!address) {
    const addressFile = path.join(__dirname, '..', 'blockchain', 'deployed-address.json');
    if (fs.existsSync(addressFile)) {
      try {
        const meta = JSON.parse(fs.readFileSync(addressFile));
        if (meta && meta.address) address = meta.address;
      } catch (e) {
        // ignore JSON error
      }
    }
  }
  if (!address) throw new Error('Contract address not provided. Set CONTRACT_ADDRESS or ensure deployed-address.json exists.');
  const { provider, signer } = getProviderAndSigner();
  const contract = signer ? new ethers.Contract(address, abi, signer) : new ethers.Contract(address, abi, provider);
  return contract;
}

async function issueCredential(cid, did, issuerId) {
  const contract = getContract();
  const tx = await contract.issueCredential(cid, did, issuerId);
  const receipt = await tx.wait();
  return receipt;
}

  async function signHash(hashString) {
    const { signer } = getProviderAndSigner();
    if (!signer) throw new Error('No signer/private key configured for signing');
    // Sign the hash string (hex) as a message. Verification can use ethers.verifyMessage(hashString, signature)
    const signature = await signer.signMessage(hashString);
    const address = await signer.getAddress();
    return { signature, address };
  }

async function verifyCredential(cid) {
  const contract = getContract();
  const data = await contract.verifyCredential(cid);
  // returns tuple: (exists, did, issuerId, issuer, revoked, issuedAt)
  return {
    exists: data[0],
    did: data[1],
    issuerId: data[2],
    issuer: data[3],
    revoked: data[4],
    issuedAt: new Date(Number(data[5]) * 1000)
  };
}

async function revokeCredential(cid) {
  const contract = getContract();
  const tx = await contract.revokeCredential(cid);
  const receipt = await tx.wait();
  return receipt;
}

module.exports = { issueCredential, verifyCredential, revokeCredential, signHash };
