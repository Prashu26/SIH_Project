const { ethers } = require('ethers');
const Certificate = require('../models/Certificate');
const MerkleTree = require('../utils/merkleTree');

// Load environment variables
require('dotenv').config();

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
    }
  } catch (error) {
    console.warn('Blockchain service initialization skipped:', error.message);
  }
}

// ABI for the MerkleCredentialRegistry smart contract
const contractABI = [
  'function setMerkleRoot(bytes32 merkleRoot) external returns (uint256)',
  'function verifyCertificate(bytes32[] memory proof, bytes32 leaf, uint256 batchId) public view returns (bool)',
  'function isRevoked(bytes32 certificateHash) public view returns (bool)',
  'function revokeCertificate(bytes32 certificateHash) external',
  'function getBatchRoot(uint256 batchId) public view returns (bytes32)',
  'function currentBatchId() public view returns (uint256)'
];

class BlockchainService {
  static async anchorBatch(certificateHashes) {
    if (!contract) {
      console.warn('Blockchain service not initialized - skipping batch anchoring');
      return { success: false, error: 'Blockchain not configured' };
    }
    
    try {
      // Create Merkle Tree with certificate hashes
      const merkleTree = new MerkleTree(certificateHashes);
      const merkleRoot = merkleTree.getRoot();
      
      // Send transaction to Polygon to anchor the Merkle root
      const tx = await contract.setMerkleRoot(merkleRoot);
      const receipt = await tx.wait();
      
      // Extract batchId from transaction logs (returned by setMerkleRoot)
      const batchId = receipt.events?.[0]?.args?.[0] || null;
      
      // Store Merkle proofs in the database
      for (const [index, hash] of certificateHashes.entries()) {
        const proof = merkleTree.getProof(hash);
        await Certificate.findOneAndUpdate(
          { metadataHash: hash },
          { 
            merkleRoot,
            merkleProof: proof,
            batchId: batchId ? batchId.toString() : null,
            status: 'Issued'
          }
        );
      }
      
      return {
        success: true,
        txHash: tx.hash,
        merkleRoot,
        batchId: batchId ? batchId.toString() : null,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error anchoring batch to blockchain:', error);
      throw new Error('Failed to anchor batch to blockchain');
    }
  }
  
  static async verifyCertificate(certificateId) {
    try {
      const certificate = await Certificate.findOne({ certificateId });
      if (!certificate) {
        throw new Error('Certificate not found');
      }
      
      const isRevoked = await contract.isRevoked(certificate.metadataHash);
      if (isRevoked) {
        return {
          isValid: false,
          status: 'Revoked',
          message: 'This certificate has been revoked by the issuing institution.'
        };
      }
      
      const isValid = await contract.verifyCertificate(
        certificate.merkleProof,
        certificate.metadataHash
      );
      
      return {
        isValid,
        status: isValid ? 'Valid' : 'Invalid',
        message: isValid 
          ? 'This certificate is valid and verified on the blockchain.'
          : 'This certificate could not be verified on the blockchain.'
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      throw new Error('Error verifying certificate');
    }
  }
  
  static async revokeCertificate(certificateId, reason) {
    try {
      const certificate = await Certificate.findOne({ certificateId });
      if (!certificate) {
        throw new Error('Certificate not found');
      }
      
      // In a real implementation, you would call a revoke function on the smart contract
      // const tx = await contract.revokeCertificate(certificate.metadataHash, reason);
      // await tx.wait();
      
      // For now, we'll just update the status in the database
      certificate.status = 'Revoked';
      certificate.revokedAt = Date.now();
      certificate.revocationReason = reason;
      await certificate.save();
      
      return {
        success: true,
        message: 'Certificate has been revoked',
        txHash: '0x...' // In a real implementation, this would be the transaction hash
      };
    } catch (error) {
      console.error('Error revoking certificate:', error);
      throw new Error('Failed to revoke certificate');
    }
  }

  static async anchorSingle(metadataHash) {
    if (!contract) {
      console.warn('Blockchain service not initialized - skipping single certificate anchoring');
      return { success: false, error: 'Blockchain not configured' };
    }
    
    try {
      // For single-certificate anchoring we set the merkle root to the metadata hash
      const merkleRoot = metadataHash;
      const tx = await contract.setMerkleRoot(merkleRoot);
      await tx.wait();

      // Update certificate record if present
      await Certificate.findOneAndUpdate(
        { metadataHash },
        { blockchainTxHash: tx.hash, merkleRoot }
      );

      return { success: true, txHash: tx.hash, merkleRoot };
    } catch (error) {
      console.error('Error anchoring single certificate:', error);
      throw new Error('Failed to anchor single certificate');
    }
  }
}

module.exports = BlockchainService;
