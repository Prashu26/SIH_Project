const ethers = require('ethers');
require('dotenv').config();

async function checkCode() {
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_PROVIDER_URL || 'http://127.0.0.1:8545');
    const address = process.env.CONTRACT_ADDRESS;
    
    console.log(`Checking code at address: ${address}`);
    
    try {
        const code = await provider.getCode(address);
        if (code === '0x') {
            console.log('ERROR: No code found at this address. The contract is not deployed or the node was restarted.');
        } else {
            console.log('SUCCESS: Contract code found.');
            console.log(`Code length: ${code.length}`);
        }
    } catch (error) {
        console.error('Error connecting to provider:', error.message);
    }
}

checkCode();
