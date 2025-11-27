// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract CredentialRegistry {
    struct Credential {
        string cid;
        string did;
        string issuerId;
        address issuer;
        uint256 issuedAt;
        bool revoked;
    }

    // CID => Credential
    mapping(string => Credential) private credentials;

    event CredentialIssued(string cid, string did, string issuerId, address issuer, uint256 issuedAt);
    event CredentialRevoked(string cid, address revokedBy, uint256 revokedAt);

    function issueCredential(string calldata cid, string calldata did, string calldata issuerId) external {
        require(bytes(cid).length > 0, "cid required");
        require(bytes(did).length > 0, "did required");

        Credential storage c = credentials[cid];
        require(c.issuedAt == 0, "credential already exists");

        c.cid = cid;
        c.did = did;
        c.issuerId = issuerId;
        c.issuer = msg.sender;
        c.issuedAt = block.timestamp;
        c.revoked = false;

        emit CredentialIssued(cid, did, issuerId, msg.sender, block.timestamp);
    }

    function verifyCredential(string calldata cid) external view returns (bool exists, string memory did, string memory issuerId, address issuer, bool revoked, uint256 issuedAt) {
        Credential storage c = credentials[cid];
        if (c.issuedAt == 0) {
            return (false, "", "", address(0), false, 0);
        }
        return (true, c.did, c.issuerId, c.issuer, c.revoked, c.issuedAt);
    }

    function revokeCredential(string calldata cid) external {
        Credential storage c = credentials[cid];
        require(c.issuedAt != 0, "credential not found");
        require(!c.revoked, "already revoked");

        // Note: In production, add access control so only issuers or admins can revoke.
        c.revoked = true;

        emit CredentialRevoked(cid, msg.sender, block.timestamp);
    }
}
