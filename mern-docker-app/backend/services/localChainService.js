const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

class LocalChainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.HARDHAT_PROVIDER_URL || 'http://127.0.0.1:8545');
    this.contract = null;
    this.signer = null;

    // Try to load deployed address
    let deployed = {};
    try {
      const deployedPath = path.resolve(__dirname, '..', 'blockchain', 'deployed-address.json');
      if (fs.existsSync(deployedPath)) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    } catch (e) {
      // ignore
    }

    const address = process.env.LEGITDOC_CONTRACT_ADDRESS || deployed.legitdocLocal?.address;

    // Try to load ABI from artifacts if exists
    let abi = null;
    try {
      const artifactPath = path.resolve(__dirname, '..', 'blockchain', 'artifacts', 'contracts', 'LegitDocLocal.sol', 'LegitDocLocal.json');
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        abi = artifact.abi;
      }
    } catch (e) {
      // ignore
    }

    if (!abi) {
      // Fallback minimal ABI
      abi = [
        'function storeHash(string memory regNo, string memory docHash) public',
        'function verifyHash(string memory regNo) public view returns (string memory)'
      ];
    }

    if (address) {
      try {
        this.signer = this.provider.getSigner(0);
        this.contract = new ethers.Contract(address, abi, this.signer);
      } catch (err) {
        console.warn('LocalChainService: failed to initialize contract:', err.message);
        this.contract = null;
      }
    } else {
      console.warn('LocalChainService: no contract address found (set LEGITDOC_CONTRACT_ADDRESS or deploy LegitDocLocal)');
    }
  }

  async storeHash(regNo, hexHash) {
    if (!this.contract) throw new Error('Local contract not initialized');
    const tx = await this.contract.storeHash(regNo, hexHash);
    const receipt = await tx.wait();
    return { txHash: receipt.transactionHash, receipt };
  }

  async verifyHash(regNo) {
    if (!this.contract) throw new Error('Local contract not initialized');
    const stored = await this.contract.verifyHash(regNo);
    return stored;
  }
}

module.exports = LocalChainService;
