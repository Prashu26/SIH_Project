const ethers = require('ethers');
const selector = ethers.id("setMerkleRoot(bytes32)").slice(0, 10);
console.log(selector);
