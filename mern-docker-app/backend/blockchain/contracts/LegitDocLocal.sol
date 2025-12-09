// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract LegitDocLocal {
    mapping(string => string) public documentHashes;

    event HashStored(string indexed regNo, string docHash);

    function storeHash(string memory regNo, string memory docHash) public {
        documentHashes[regNo] = docHash;
        emit HashStored(regNo, docHash);
    }

    function verifyHash(string memory regNo) public view returns (string memory) {
        return documentHashes[regNo];
    }
}
