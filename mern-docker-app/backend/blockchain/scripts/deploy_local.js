const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const LegitDocLocal = await ethers.getContractFactory('LegitDocLocal');
  const contract = await LegitDocLocal.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('LegitDocLocal deployed to:', address);

  const outPath = path.join(__dirname, '..', 'deployed-address.json');
  const out = { legitdocLocal: { address, deployedAt: new Date().toISOString() } };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote deployed-address.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
