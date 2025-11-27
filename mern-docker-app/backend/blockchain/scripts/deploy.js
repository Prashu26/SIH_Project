const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  // Deploy MerkleCredentialRegistry for batch anchoring
  const MerkleCredentialRegistry = await ethers.getContractFactory('MerkleCredentialRegistry');
  const merkleRegistry = await MerkleCredentialRegistry.deploy();
  await merkleRegistry.waitForDeployment();

  const address = await merkleRegistry.getAddress();
  console.log('MerkleCredentialRegistry deployed to:', address);

  const out = {
    address: address,
    network: process.env.PROVIDER_URL || 'hardhat',
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(path.join(__dirname, '..', 'deployed-address.json'), JSON.stringify(out, null, 2));
  console.log('Wrote deployed-address.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
