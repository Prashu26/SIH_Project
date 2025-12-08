const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load ABI from artifact
const artifactPath = path.resolve(__dirname, '../blockchain/artifacts/contracts/MerkleCredentialRegistry.sol/MerkleCredentialRegistry.json');
let contractABI;

try {
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    contractABI = artifact.abi;
  } else {
    console.warn(`Warning: Contract artifact not found at ${artifactPath}. Using fallback ABI.`);
    // Fallback ABI if artifact is missing (e.g. in Docker if artifacts aren't copied)
    contractABI = [
      'function setMerkleRoot(bytes32 merkleRoot) external returns (uint256)',
      'function verifyCertificate(bytes32[] memory proof, bytes32 leaf, uint256 batchId) public view returns (bool)',
      'function isRevoked(bytes32 certificateHash) public view returns (bool)',
      'function revokeCertificate(bytes32 certificateHash) external',
      'function getBatchRoot(uint256 batchId) public view returns (bytes32)',
      'function currentBatchId() public view returns (uint256)',
      'event MerkleRootSet(uint256 indexed batchId, bytes32 merkleRoot, uint256 timestamp)'
    ];
  }
} catch (error) {
  console.error('Error loading contract artifact:', error);
  contractABI = [];
}

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_PROVIDER_URL || 'http://127.0.0.1:8545');
    this.wallet = null;
    this.contract = null;
    
    if (process.env.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      if (process.env.CONTRACT_ADDRESS) {
        this.contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, this.wallet);
      }
    }
  }

  /**
   * Core Function 1: Document Hashing (Fingerprint Generation)
   * Computes SHA-256 hash of the document buffer
   * @param {Buffer} fileBuffer 
   * @returns {string} Hex string of the hash (0x...)
   */
  static calculateHash(fileBuffer) {
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return '0x' + hash;
  }

  /**
   * Core Function 2: Blockchain Anchoring
   * Anchors a list of document hashes to the blockchain via Merkle Tree
   * @param {string[]} docHashes - Array of document hashes (0x...)
   * @returns {Promise<Object>} - { root, batchId, txHash, proofs }
   */
  async anchorDocuments(docHashes) {
    if (!this.contract) throw new Error('Blockchain service not initialized with contract');

    // Create Merkle Tree
    const leaves = docHashes.map(hash => Buffer.from(hash.replace('0x', ''), 'hex'));
    const tree = new MerkleTree(leaves, (data) => crypto.createHash('sha256').update(data).digest(), { sortPairs: true });
    const root = tree.getHexRoot();

    console.log(`Anchoring Merkle Root: ${root}`);

    // Send transaction
    const tx = await this.contract.setMerkleRoot(root);
    const receipt = await tx.wait();

    // Get Batch ID from event
    const event = receipt.logs.find(log => {
      try {
        return this.contract.interface.parseLog(log).name === 'MerkleRootSet';
      } catch (e) { return false; }
    });
    
    const batchId = event ? this.contract.interface.parseLog(event).args.batchId.toString() : null;

    // Generate proofs for all documents
    const proofs = {};
    docHashes.forEach(hash => {
      const leaf = Buffer.from(hash.replace('0x', ''), 'hex');
      proofs[hash] = tree.getHexProof(leaf);
    });

    return {
      root,
      batchId,
      txHash: receipt.hash,
      proofs
    };
  }

  /**
   * Core Function 4: Document Verification
   * Verifies a document against the blockchain
   * @param {string} docHash - Hash of the document to verify
   * @param {string[]} proof - Merkle proof
   * @param {string} root - Merkle root
   * @param {string} batchId - Batch ID on chain
   * @returns {Promise<Object>} Verification result
   */
  async verifyDocument(docHash, proof, root, batchId) {
    // 1. Verify mathematically off-chain
    const leaf = Buffer.from(docHash.replace('0x', ''), 'hex');
    const tree = new MerkleTree([], (data) => crypto.createHash('sha256').update(data).digest(), { sortPairs: true });
    const isValidOffChain = tree.verify(proof, leaf, root);

    if (!isValidOffChain) {
      return { 
        valid: false, 
        localVerification: false,
        reason: 'Invalid Merkle Proof' 
      };
    }

    let onChainRoot = null;

    // 2. Verify on-chain (check if root exists for batchId)
    if (this.contract) {
      try {
        onChainRoot = await this.contract.getBatchRoot(batchId);
        if (onChainRoot !== root) {
          return { 
            valid: false, 
            localVerification: true,
            onChainVerification: false,
            onChainRoot,
            reason: 'Merkle Root mismatch on blockchain' 
          };
        }
        
        // Check revocation
        const isRevoked = await this.contract.isRevoked(docHash);
        if (isRevoked) {
          return { 
            valid: false, 
            localVerification: true,
            onChainVerification: true,
            onChainRoot,
            reason: 'Certificate has been revoked' 
          };
        }
      } catch (error) {
        console.error('Blockchain verification error:', error);
        // Fallback to off-chain only if blockchain fails (optional, but safer to fail)
        return { 
          valid: false, 
          localVerification: true,
          onChainVerification: false,
          reason: 'Blockchain connection failed: ' + error.message 
        };
      }
    }

    return { 
      valid: true, 
      localVerification: true,
      onChainVerification: !!this.contract,
      onChainRoot
    };
  }
}

module.exports = BlockchainService;
