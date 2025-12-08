const Document = require('../models/Document');
const BlockchainService = require('./blockchainService');
const logger = require('../utils/logger');

class AnchoringService {
  constructor({ intervalMs = 60000, batchSize = 20 } = {}) {
    this.intervalMs = intervalMs;
    this.batchSize = batchSize;
    this.running = false;
    this.bc = new BlockchainService();
  }

  async runOnce() {
    try {
      // Find documents that are not anchored and not revoked
      const docs = await Document.find({ batchId: { $in: [null, undefined, ''] }, revoked: { $ne: true } }).limit(this.batchSize).lean();
      if (!docs || docs.length === 0) return;

      const hashes = docs.map(d => d.sha256).filter(Boolean);
      if (hashes.length === 0) return;

      if (!this.bc.contract) {
        logger.warn('Anchoring skipped: blockchain contract not configured');
        return;
      }

      logger.info(`Anchoring ${hashes.length} documents`);
      const result = await this.bc.anchorDocuments(hashes);
      if (!result || !result.txHash) {
        logger.warn('Anchoring returned no txHash');
        return;
      }

      const { root, batchId, txHash, proofs } = result;

      // Update each document with its proof and batch info
      for (const doc of docs) {
        const proof = proofs[doc.sha256] || [];
        await Document.updateOne({ _id: doc._id }, { $set: { anchoredTx: txHash, batchId, merkleRoot: root, merkleProof: proof } });
      }

      logger.info(`Anchored batch ${batchId} tx ${txHash}`);
    } catch (err) {
      logger.error('Anchoring service error:', err.message || err);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    // Run immediately then on interval
    this.runOnce().catch(err => logger.error('Anchoring initial run failed', err));
    this._timer = setInterval(() => this.runOnce().catch(err => logger.error('Anchoring run failed', err)), this.intervalMs);
    logger.info('AnchoringService started');
  }

  stop() {
    this.running = false;
    if (this._timer) clearInterval(this._timer);
    logger.info('AnchoringService stopped');
  }
}

module.exports = AnchoringService;
