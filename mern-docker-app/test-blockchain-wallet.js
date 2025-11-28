const { ethers } = require('ethers');

(async () => {
  try {
    console.log('=== FUNDING WALLET ON LOCAL BLOCKCHAIN ===\n');
    
    // Connect to local Hardhat node
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Get the pre-funded account from Hardhat
    const accounts = await provider.listAccounts();
    console.log('Available accounts:', accounts.length);
    
    if (accounts.length === 0) {
      console.log('No accounts available on local blockchain');
      return;
    }
    
    // Get the first account (pre-funded by Hardhat)
    const fundedAccount = accounts[0];
    console.log('Funded account:', fundedAccount.address);
    
    const balance = await provider.getBalance(fundedAccount.address);
    console.log('Funded account balance:', ethers.formatEther(balance), 'ETH');
    
    // The wallet we're using in our app
    const targetWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // First Hardhat account
    const targetBalance = await provider.getBalance(targetWallet);
    console.log('Target wallet:', targetWallet);
    console.log('Target wallet balance:', ethers.formatEther(targetBalance), 'ETH');
    
    if (targetBalance > 0) {
      console.log('✅ Wallet is already funded on local blockchain!');
    } else {
      console.log('❌ Wallet needs funding');
    }
    
    console.log('\n=== CONTRACT INFO ===');
    const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const code = await provider.getCode(contractAddress);
    console.log('Contract deployed:', code !== '0x');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();