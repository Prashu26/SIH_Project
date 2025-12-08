const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
const Batch = require('../models/Batch');
const Certificate = require('../models/Certificate');
const logger = require('../utils/logger');

// Initialize provider (will be set from environment variables)
let provider;
let contract;
let signer;

// Initialize the blockchain service
function initBlockchainService() {
  const rpcUrl = process.env.BLOCKCHAIN_PROVIDER_URL || process.env.POLYGON_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY || process.env.ISSUER_PRIVATE_KEY; // Should be stored in KMS in production
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error('Missing required environment variables for blockchain service: BLOCKCHAIN_PROVIDER_URL/POLYGON_RPC_URL, PRIVATE_KEY/ISSUER_PRIVATE_KEY, CONTRACT_ADDRESS');
  }

  try {
    provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    signer = new ethers.Wallet(privateKey, provider);
    
    // ABI for the LegitAnchor contract
    const abi = [
      'function anchorRoot(bytes32 rootHash, bytes32 batchId, string calldata instituteCode) external',
      'function revokeCertificate(bytes32 certHash, bytes32 batchId) external',
      'event RootAnchored(bytes32 indexed rootHash, bytes32 indexed batchId, address indexed issuer, uint256 timestamp, string instituteCode)',
      'event CertificateRevoked(bytes32 indexed certHash, bytes32 indexed batchId, address indexed issuer, uint256 timestamp)'
    ];

    contract = new ethers.Contract(contractAddress, abi, signer);
    logger.info('Blockchain service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize blockchain service:', error);
    throw error;
  }
}

// Helper function to compute SHA-256 hash
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

// Create a Merkle tree from certificate hashes
async function createMerkleTree(certificateHashes) {
  try {
    const leaves = certificateHashes.map(hash => Buffer.from(hash, 'hex'));
    const tree = new MerkleTree(leaves, sha256, { sortPairs: true });
    return {
      root: '0x' + tree.getRoot().toString('hex'),
      tree
    };
  } catch (error) {
    logger.error('Error creating Merkle tree:', error);
    throw error;
  }
}

// Anchor a batch of certificates on the blockchain
async function anchorBatch(batchId, instituteCode) {
  try {
    const batch = await Batch.findOne({ batch_id: batchId }).populate('certificate_ids');
    if (!batch) {
      throw new Error('Batch not found');
    }

    logger.info(`Anchoring batch ${batchId} with ${batch.certificate_ids.length} certificates`);
    
    // Get all certificate hashes for this batch
    const certificateHashes = batch.certificate_ids.map(cert => cert.sha256);
    
    // Create Merkle tree
    const { root, tree } = await createMerkleTree(certificateHashes);
    
    // Store Merkle proofs for each certificate
    for (const cert of batch.certificate_ids) {
      const proof = tree.getHexProof(Buffer.from(cert.sha256, 'hex'));
      await Certificate.findByIdAndUpdate(cert._id, {
        merkle_proof: proof,
        status: 'READY'
      });
    }

    // Update batch with root hash
    batch.root_hash = root;
    await batch.save();

    // Anchor root on blockchain
    const tx = await contract.anchorRoot(
      root,
      ethers.utils.formatBytes32String(batchId),
      instituteCode
    );

    logger.info(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Update batch with transaction hash
    batch.anchored_tx = receipt.transactionHash;
    batch.status = 'ANCHORED';
    await batch.save();

    // Update all certificates in the batch
    await Certificate.updateMany(
      { _id: { $in: batch.certificate_ids } },
      { 
        status: 'ISSUED',
        issue_date: new Date(),
        blockchain_tx: receipt.transactionHash
      }
    );

    logger.info(`Batch ${batchId} anchored successfully with tx: ${receipt.transactionHash}`);
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      rootHash: root,
      batchId
    };
  } catch (error) {
    logger.error(`Error anchoring batch ${batchId}:`, error);
    await Batch.findOneAndUpdate(
      { batch_id: batchId },
      { status: 'FAILED', error: error.message }
    );
    throw error;
  }
}

// Verify a certificate
async function verifyCertificate(certificateHash, proof, rootHash) {
  try {
    const leaf = Buffer.from(certificateHash, 'hex');
    const proofBuffers = proof.map(p => Buffer.from(p.slice(2), 'hex'));
    const rootBuffer = Buffer.from(rootHash.slice(2), 'hex');
    
    const tree = new MerkleTree([], sha256, { sortPairs: true });
    return tree.verify(proofBuffers, leaf, rootBuffer);
  } catch (error) {
    logger.error('Error verifying certificate:', error);
    return false;
  }
}

// Revoke a certificate
async function revokeCertificate(certificateId, reason) {
  try {
    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    logger.info(`Revoking certificate ${certificateId} with reason: ${reason}`);
    
    const tx = await contract.revokeCertificate(
      '0x' + certificate.sha256,
      ethers.utils.formatBytes32String(certificate.batch_id.toString())
    );

    logger.info(`Revocation transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();

    // Update certificate status
    certificate.status = 'REVOKED';
    certificate.revoked_at = new Date();
    certificate.revocation_reason = reason;
    certificate.blockchain_tx = receipt.transactionHash;
    await certificate.save();

    logger.info(`Certificate ${certificateId} revoked successfully with tx: ${receipt.transactionHash}`);
    
    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    logger.error(`Error revoking certificate:`, error);
    throw error;
  }
}

module.exports = {
  initBlockchainService,
  anchorBatch,
  verifyCertificate,
  revokeCertificate,
  sha256: (data) => sha256(data).toString('hex')
};
