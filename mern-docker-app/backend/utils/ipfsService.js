require('dotenv').config();

let _clientPromise = null;

async function getClient() {
  if (_clientPromise) return _clientPromise;
  _clientPromise = (async () => {
    const mod = await import('ipfs-http-client');
    const create = mod.create;
    const url = process.env.IPFS_API_URL || 'http://ipfs:5001';
    const projectId = process.env.IPFS_PROJECT_ID;
    const projectSecret = process.env.IPFS_PROJECT_SECRET;
    const headers = {};
    if (projectId && projectSecret) {
      const auth = Buffer.from(`${projectId}:${projectSecret}`).toString('base64');
      headers.authorization = `Basic ${auth}`;
    }
    return create({ url, headers });
  })();
  return _clientPromise;
}

async function uploadBuffer(buffer, filename) {
  const ipfs = await getClient();
  const result = await ipfs.add({ content: buffer, path: filename });
  if (result && result.cid) return result.cid.toString();
  // Handle async iterable form
  if (typeof result[Symbol.asyncIterator] === 'function') {
    for await (const file of result) {
      if (file && file.cid) return file.cid.toString();
    }
  }
  if (Array.isArray(result) && result.length && result[0].cid) {
    return result[0].cid.toString();
  }
  throw new Error('IPFS upload failed');
}

module.exports = { uploadBuffer };
