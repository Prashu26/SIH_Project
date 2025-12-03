const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');

// Load environment variables
require('dotenv').config();

// ABI for the MerkleCredentialRegistry smart contract
const contractABI = [
  'function setMerkleRoot(bytes32 merkleRoot) external returns (uint256)',
  'function verifyCertificate(bytes32[] memory proof, bytes32 leaf, uint256 batchId) public view returns (bool)',
  'function isRevoked(bytes32 certificateHash) public view returns (bool)',
  'function revokeCertificate(bytes32 certificateHash) external',
  'function getBatchRoot(uint256 batchId) public view returns (bytes32)',
  'function currentBatchId() public view returns (uint256)',
  'event MerkleRootSet(uint256 indexed batchId, bytes32 merkleRoot, uint256 timestamp)'
];

// Initialize Polygon provider
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || process.env.PROVIDER_URL || 'http://localhost:8545');
const privateKey = process.env.PRIVATE_KEY;
let wallet, contract;

// Only initialize wallet and contract if private key is available
if (privateKey && privateKey.length > 10) {
  try {
    wallet = new ethers.Wallet(privateKey, provider);
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (contractAddress) {
      contract = new ethers.Contract(contractAddress, contractABI, wallet);
      console.log('✅ Blockchain service initialized with contract:', contractAddress);
    } else {
      console.warn('⚠️ CONTRACT_ADDRESS not set - blockchain features disabled');
    }
  } catch (error) {
    console.warn('⚠️ Blockchain service initialization skipped:', error.message);
  }
} else {
  console.warn('⚠️ PRIVATE_KEY not set - blockchain features disabled');
}

/**
 * Helper: Convert string to bytes32 format
 */
function toBytes32(value) {
  if (value.startsWith('0x') && value.length === 66) {
    return value;
  }
  return ethers.zeroPadValue(ethers.toUtf8Bytes(value), 32);
}

/**
 * Helper: Hash a certificate's metadata using SHA-256
 */
function hashCertificate(certificateData) {
  const dataString = JSON.stringify({
    certificateId: certificateData.certificateId,
    learner: certificateData.learner,
    course: certificateData.course,
    institute: certificateData.institute,
    issueDate: certificateData.issueDate,
    validUntil: certificateData.validUntil
  });
  
  const hash = crypto.createHash('sha256').update(dataString).digest();
  return '0x' + hash.toString('hex');
}

class BlockchainService {
  /**
   * Step 1: Create Merkle Tree from certificate hashes
   * @param {string[]} certificateHashes - Array of certificate metadata hashes (bytes32)
   * @returns {object} - { tree, root, leaves }
   */
  static createMerkleTree(certificateHashes) {
    if (!certificateHashes || certificateHashes.length === 0) {
      throw new Error('Cannot create Merkle tree from empty array');
    }

    // Ensure all hashes are properly formatted as bytes32
    const leaves = certificateHashes.map(hash => {
      if (!hash.startsWith('0x')) {
        hash = '0x' + hash;
      }
      return hash;
    });

    // Create Merkle tree using keccak256 hashing
    const tree = new MerkleTree(leaves, ethers.keccak256, { 
      sortPairs: true,
      hashLeaves: false // leaves are already hashed
    });
    
    const root = tree.getHexRoot();
    
    console.log(`📊 Merkle Tree created:`);
    console.log(`  - Leaves: ${leaves.length}`);
    console.log(`  - Root: ${root}`);
    
    return { tree, root, leaves };
  }

  /**
   * Step 2: Generate Merkle proof for a specific certificate
   * @param {MerkleTree} tree - The Merkle tree
   * @param {string} leafHash - The certificate's metadata hash
   * @returns {string[]} - Array of proof hashes (bytes32[])
   */
  static generateMerkleProof(tree, leafHash) {
    if (!leafHash.startsWith('0x')) {
      leafHash = '0x' + leafHash;
    }
    
    const proof = tree.getHexProof(leafHash);
    return proof;
  }

  /**
   * Step 3: Verify Merkle proof locally (before on-chain verification)
   * @param {string[]} proof - Array of proof hashes
   * @param {string} leafHash - The certificate's metadata hash
   * @param {string} root - The Merkle root
   * @returns {boolean} - True if proof is valid
   */
  static verifyMerkleProof(proof, leafHash, root) {
    if (!leafHash.startsWith('0x')) {
      leafHash = '0x' + leafHash;
    }
    if (!root.startsWith('0x')) {
      root = '0x' + root;
    }
    
    const isValid = MerkleTree.verify(proof, leafHash, root, ethers.keccak256, { sortPairs: true });
    return isValid;
  }

  /**
   * Step 4: Anchor Merkle root on Polygon blockchain
   * @param {Array} certificateData - Array of certificate objects or hashes
   * @returns {object} - { success, txHash, merkleRoot, batchId, proofs, timestamp }
   */
  static async anchorBatch(certificateData) {
    if (!contract) {
      console.warn('⚠️ Blockchain service not initialized - skipping batch anchoring');
      return { 
        success: false, 
        error: 'Blockchain not configured',
        message: 'Set POLYGON_RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS to enable blockchain anchoring'
      };
    }
    
    try {
      console.log(`🔗 Starting batch anchoring for ${certificateData.length} certificates...`);
      
      // Extract or generate hashes
      const certificateHashes = certificateData.map((cert) => {
        const rawHash = typeof cert === 'string' ? cert : cert.metadataHash || hashCertificate(cert);
        const prefixed = rawHash.startsWith('0x') ? rawHash : `0x${rawHash}`;
        return ethers.hexlify(ethers.zeroPadValue(prefixed, 32));
      });

      // Step 1: Create Merkle Tree
      const { tree, root, leaves } = this.createMerkleTree(certificateHashes);
      
      // Step 2: Send transaction to Polygon to anchor the Merkle root
      console.log('📤 Sending transaction to Polygon...');
      const tx = await contract.setMerkleRoot(root);
      console.log(`  - Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!');
      
      // Step 3: Extract batchId from event logs
      let batchId = null;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          // Parse the MerkleRootSet event
          const iface = new ethers.Interface(contractABI);
          for (const log of receipt.logs) {
            try {
              const parsed = iface.parseLog(log);
              if (parsed && parsed.name === 'MerkleRootSet') {
                batchId = parsed.args[0]; // First argument is batchId
                console.log(`  - Batch ID: ${batchId.toString()}`);
                break;
              }
            } catch (e) {
              // Not the event we're looking for, continue
            }
          }
        } catch (error) {
          console.warn('Could not parse event logs:', error.message);
        }
      }

      // If we couldn't get batchId from events, query the contract
      if (!batchId) {
        try {
          batchId = await contract.currentBatchId();
          console.log(`  - Retrieved current batch ID: ${batchId.toString()}`);
        } catch (error) {
          console.warn('Could not retrieve batch ID from contract');
        }
      }
      
      // Step 4: Generate proofs for each certificate
      const proofs = [];
      for (let i = 0; i < leaves.length; i++) {
        const leafHash = leaves[i];
        const proof = this.generateMerkleProof(tree, leafHash);
        
        proofs.push({
          certificateHash: leafHash,
          merkleProof: proof,
          merkleRoot: root,
          batchId: batchId ? batchId.toString() : null
        });
      }
      
      console.log(`✅ Generated ${proofs.length} Merkle proofs`);
      
      return {
        success: true,
        txHash: tx.hash,
        merkleRoot: root,
        batchId: batchId ? batchId.toString() : null,
        proofs,
        timestamp: Date.now(),
        gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : null
      };
    } catch (error) {
      console.error('❌ Error anchoring batch to blockchain:', error);
      throw new Error(`Failed to anchor batch to blockchain: ${error.message}`);
    }
  }

  /**
   * Step 5: Verify certificate on-chain using smart contract
   * @param {string[]} proof - Merkle proof (bytes32[])
   * @param {string} leafHash - Certificate metadata hash
   * @param {string|number} batchId - Batch ID from anchoring
   * @returns {object} - { isValid, status, message, onChainRoot }
   */
  static async verifyOnChain(proof, leafHash, batchId) {
    if (!contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      console.log(`🔍 Verifying certificate on-chain...`);
      console.log(`  - Leaf: ${leafHash}`);
      console.log(`  - Batch ID: ${batchId}`);
      console.log(`  - Proof length: ${proof.length}`);

      // Step 1: Get the on-chain Merkle root for this batch
      const onChainRoot = await contract.getBatchRoot(batchId);
      console.log(`  - On-chain root: ${onChainRoot}`);

      // Step 2: Check if certificate is revoked
      const isRevoked = await contract.isRevoked(leafHash);
      if (isRevoked) {
        return {
          isValid: false,
          status: 'Revoked',
          message: 'This certificate has been revoked by the issuing institution.',
          onChainRoot
        };
      }

      // Step 3: Verify the Merkle proof on-chain
      const isValid = await contract.verifyCertificate(proof, leafHash, batchId);
      
      console.log(`  - Verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

      return {
        isValid,
        status: isValid ? 'Valid' : 'Invalid',
        message: isValid 
          ? 'Certificate is valid and verified on the Polygon blockchain.'
          : 'Certificate verification failed. The certificate may have been tampered with.',
        onChainRoot,
        batchId: batchId.toString()
      };
    } catch (error) {
      console.error('❌ Error verifying certificate on-chain:', error);
      throw new Error(`On-chain verification failed: ${error.message}`);
    }
  }

  /**
   * Verify certificate using database proof (3-step process)
   * @param {string} certificateId - Certificate ID
   * @returns {object} - Full verification result
   */
  static async verifyCertificate(certificateId) {
    try {
      // Step 1: Get certificate from database (contains local proof)
      const certificate = await Certificate.findOne({ certificateId })
        .populate('learner', 'name email')
        .populate('course', 'title')
        .populate('institute', 'name');
      
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      if (!certificate.merkleProof || !certificate.merkleRoot || !certificate.batchId) {
        return {
          isValid: false,
          status: 'Not Anchored',
          message: 'This certificate has not been anchored on the blockchain yet.',
          certificate
        };
      }

      // Step 2: Verify locally first (faster, no gas cost)
      const localVerification = this.verifyMerkleProof(
        certificate.merkleProof,
        certificate.metadataHash,
        certificate.merkleRoot
      );

      if (!localVerification) {
        return {
          isValid: false,
          status: 'Invalid Proof',
          message: 'Local Merkle proof verification failed.',
          certificate
        };
      }

      console.log('✅ Local verification passed');

      // Step 3: Verify on-chain (read-only, no gas cost)
      if (!contract) {
        return {
          isValid: localVerification,
          status: 'Verified Locally',
          message: 'Certificate is cryptographically valid (blockchain verification unavailable).',
          certificate,
          localVerification
        };
      }

      const onChainResult = await this.verifyOnChain(
        certificate.merkleProof,
        certificate.metadataHash,
        certificate.batchId
      );

      return {
        ...onChainResult,
        certificate,
        localVerification,
        blockchainTxHash: certificate.blockchainTxHash
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      throw new Error(`Certificate verification failed: ${error.message}`);
    }
  }

  /**
   * Revoke a certificate on-chain
   * @param {string} certificateId - Certificate ID
   * @param {string} reason - Revocation reason
   * @returns {object} - { success, message, txHash }
   */
  static async revokeCertificate(certificateId, reason) {
    if (!contract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const certificate = await Certificate.findOne({ certificateId });
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      console.log(`🚫 Revoking certificate ${certificateId}...`);

      // Call smart contract to revoke certificate
      const tx = await contract.revokeCertificate(certificate.metadataHash);
      const receipt = await tx.wait();

      console.log(`✅ Certificate revoked on-chain: ${tx.hash}`);

      // Update database
      certificate.status = 'Revoked';
      certificate.revokedAt = new Date();
      certificate.revocationReason = reason;
      certificate.revocationTxHash = tx.hash;
      await certificate.save();

      return {
        success: true,
        message: 'Certificate has been revoked on the blockchain',
        txHash: tx.hash,
        gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : null
      };
    } catch (error) {
      console.error('Error revoking certificate:', error);
      throw new Error(`Failed to revoke certificate: ${error.message}`);
    }
  }

  /**
   * Anchor a single certificate (creates a tree with one leaf)
   * @param {string} metadataHash - Certificate metadata hash
   * @returns {object} - Anchoring result
   */
  static async anchorSingle(metadataHash) {
    if (!contract) {
      console.warn('Blockchain service not initialized - skipping single certificate anchoring');
      return { success: false, error: 'Blockchain not configured' };
    }
    
    try {
      // For single certificate, create a tree with one leaf
      const result = await this.anchorBatch([metadataHash]);
      
      if (result.success && result.proofs && result.proofs.length > 0) {
        // Update certificate record
        await Certificate.findOneAndUpdate(
          { metadataHash },
          { 
            blockchainTxHash: result.txHash,
            merkleRoot: result.merkleRoot,
            merkleProof: result.proofs[0].merkleProof,
            batchId: result.batchId
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error anchoring single certificate:', error);
      throw new Error('Failed to anchor single certificate');
    }
  }

  /**
   * Get blockchain network info
   */
  static async getNetworkInfo() {
    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      return {
        chainId: network.chainId.toString(),
        name: network.name,
        blockNumber,
        contractAddress: contract ? await contract.getAddress() : null,
        isInitialized: !!contract
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        isInitialized: false,
        error: error.message
      };
    }
  }
}

module.exports = BlockchainService;
