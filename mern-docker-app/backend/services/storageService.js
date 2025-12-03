const mongoose = require('mongoose');

const DEFAULT_BUCKET = process.env.CERTIFICATE_BUCKET_NAME || 'certificateArtifacts';
let bucketCache = null;

function getBucket() {
  if (bucketCache) {
    return bucketCache;
  }

  const connection = mongoose.connection;
  if (!connection || !connection.db) {
    throw new Error('MongoDB connection is not ready. Ensure Mongoose is connected before storing files.');
  }

  bucketCache = new mongoose.mongo.GridFSBucket(connection.db, {
    bucketName: DEFAULT_BUCKET
  });

  return bucketCache;
}

async function saveFileFromBuffer(filename, buffer, contentType, metadata = {}) {
  const bucket = getBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata,
      contentType
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));

    uploadStream.end(buffer);
  });
}

async function deleteFileById(fileId) {
  if (!fileId) return;

  const bucket = getBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;

  return bucket.delete(objectId);
}

async function getFileStream(fileId) {
  if (!fileId) {
    return null;
  }

  const bucket = getBucket();
  let objectId;

  try {
    objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  } catch (error) {
    return null;
  }

  const files = await bucket.find({ _id: objectId }).toArray();

  if (!files || files.length === 0) {
    return null;
  }

  const fileDoc = files[0];
  const stream = bucket.openDownloadStream(objectId);
  return {
    stream,
    info: fileDoc
  };
}

module.exports = {
  saveFileFromBuffer,
  deleteFileById,
  getFileStream
};
