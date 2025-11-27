const fs = require('fs');
const path = require('path');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const proofUploadsDir = path.join(uploadsRoot, 'proofs');
const certificateArtifactsDir = path.join(__dirname, '..', 'generated');
const certificateUploadsDir = path.join(uploadsRoot, 'certificates');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadsRoot);
ensureDir(proofUploadsDir);
ensureDir(certificateArtifactsDir);
ensureDir(certificateUploadsDir);

module.exports = {
  ensureDir,
  proofUploadsDir,
  certificateArtifactsDir,
  certificateUploadsDir,
};
