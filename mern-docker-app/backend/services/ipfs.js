const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let ipfsClient;

// Initialize IPFS client (uses dynamic import because package is ESM)
async function initIPFS() {
  try {
    const ipfsEndpoint = process.env.IPFS_ENDPOINT || 'http://localhost:5001';
    const ipfsModule = await import('ipfs-http-client');
    const create = ipfsModule.create || ipfsModule.default?.create || ipfsModule.default;
    if (!create) throw new Error('ipfs-http-client.create not found');
    ipfsClient = create({ url: ipfsEndpoint });
    logger.info('IPFS client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize IPFS client:', error);
    // Do not throw here; allow app to continue running without IPFS
  }
}

// Upload file to IPFS
async function uploadToIPFS(fileBuffer, fileName) {
  if (!ipfsClient) {
    throw new Error('IPFS client not initialized');
  }

  try {
    logger.info(`Uploading file ${fileName} to IPFS`);
    const file = {
      path: fileName,
      content: fileBuffer
    };

    const result = await ipfsClient.add(file);
    logger.info(`File uploaded to IPFS with CID: ${result.cid.toString()}`);
    
    return result.cid.toString();
  } catch (error) {
    logger.error('Error uploading to IPFS:', error);
    throw error;
  }
}

// Get file from IPFS
async function getFromIPFS(cid) {
  if (!ipfsClient) {
    throw new Error('IPFS client not initialized');
  }

  try {
    logger.info(`Retrieving file with CID: ${cid} from IPFS`);
    const chunks = [];
    for await (const chunk of ipfsClient.cat(cid)) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    logger.info(`Successfully retrieved file with CID: ${cid}`);
    return fileBuffer;
  } catch (error) {
    logger.error(`Error getting file with CID ${cid} from IPFS:`, error);
    throw error;
  }
}

// Upload a local file to IPFS
async function uploadLocalFile(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    return await uploadToIPFS(fileBuffer, fileName);
  } catch (error) {
    logger.error(`Error uploading local file ${filePath} to IPFS:`, error);
    throw error;
  }
}

module.exports = {
  initIPFS,
  uploadToIPFS,
  getFromIPFS,
  uploadLocalFile
};
