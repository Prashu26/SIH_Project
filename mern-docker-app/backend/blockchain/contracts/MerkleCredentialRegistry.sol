// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MerkleCredentialRegistry {
    // Batch ID => Merkle Root
    mapping(uint256 => bytes32) public batchRoots;
    
    // Certificate hash => revoked status
    mapping(bytes32 => bool) public revokedCertificates;
    
    uint256 public currentBatchId;
    
    event MerkleRootSet(uint256 indexed batchId, bytes32 indexed merkleRoot, address indexed issuer, uint256 timestamp);
    event CertificateRevoked(bytes32 indexed certificateHash, address indexed revokedBy, uint256 timestamp);
    
    /**
     * @dev Anchor a new Merkle root representing a batch of certificates
     * @param merkleRoot The root hash of the Merkle tree for this batch
     */
    function setMerkleRoot(bytes32 merkleRoot) external returns (uint256) {
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        
        currentBatchId++;
        batchRoots[currentBatchId] = merkleRoot;
        
        emit MerkleRootSet(currentBatchId, merkleRoot, msg.sender, block.timestamp);
        
        return currentBatchId;
    }
    
    /**
     * @dev Verify a certificate using its Merkle proof
     * @param proof Array of proof hashes for the Merkle path
     * @param leaf The certificate hash (leaf node)
     * @param batchId The batch ID containing this certificate
     * @return bool True if the certificate is valid and not revoked
     */
    function verifyCertificate(
        bytes32[] memory proof,
        bytes32 leaf,
        uint256 batchId
    ) public view returns (bool) {
        if (revokedCertificates[leaf]) {
            return false;
        }
        
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == batchRoots[batchId];
    }
    
    /**
     * @dev Revoke a certificate by its hash
     * @param certificateHash The hash of the certificate to revoke
     */
    function revokeCertificate(bytes32 certificateHash) external {
        require(!revokedCertificates[certificateHash], "Already revoked");
        
        revokedCertificates[certificateHash] = true;
        
        emit CertificateRevoked(certificateHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if a certificate is revoked
     * @param certificateHash The hash of the certificate
     * @return bool True if revoked
     */
    function isRevoked(bytes32 certificateHash) public view returns (bool) {
        return revokedCertificates[certificateHash];
    }
    
    /**
     * @dev Get the Merkle root for a specific batch
     * @param batchId The batch ID
     * @return bytes32 The Merkle root
     */
    function getBatchRoot(uint256 batchId) public view returns (bytes32) {
        return batchRoots[batchId];
    }
}
