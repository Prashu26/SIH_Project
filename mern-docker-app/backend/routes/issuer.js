const express = require('express');
const fsPromises = require('fs/promises');
const auth = require('../middleware/auth');
const issuerService = require('../services/issuerService');
const { upload, handleUploadErrors } = require('../utils/fileUpload');
const logger = require('../utils/logger');

const router = express.Router();
const singleUpload = upload.single('file');

function runSingleUpload(req, res, next) {
  singleUpload(req, res, (err) => {
    if (err) {
      return handleUploadErrors(err, req, res, next);
    }
    next();
  });
}

function resolveInstituteCode(req) {
  return req.user?.institute_code || req.body?.institute_code || req.query?.institute_code;
}

router.post(
  '/upload',
  auth(['institute', 'institution']),
  runSingleUpload,
  async (req, res) => {
    let csvPath;
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'CSV file is required.' });
      }
      if (req.file.mimetype !== 'text/csv') {
        return res.status(400).json({ success: false, message: 'Only CSV files are supported for batch upload.' });
      }

      const instituteCode = resolveInstituteCode(req);
      if (!instituteCode) {
        return res.status(400).json({ success: false, message: 'Institute code is required in token payload or request body.' });
      }

      csvPath = req.file.path;

      const anchorFlag = req.body?.anchor;
      const shouldAnchor = anchorFlag === undefined ? true : anchorFlag !== 'false';
      const useIpfs = req.body?.ipfs === 'true' || process.env.USE_IPFS === 'true';

      const result = await issuerService.createBatchFromCsv({
        instituteCode,
        csvPath,
        options: {
          anchor: shouldAnchor,
          useIpfs
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Batch processed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Batch upload failed: %s', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to process batch upload',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (csvPath) {
        try {
          await fsPromises.unlink(csvPath);
        } catch (unlinkErr) {
          logger.warn('Failed to remove temporary CSV %s: %s', csvPath, unlinkErr.message);
        }
      }
    }
  }
);

router.get(
  '/batches',
  auth(['institute', 'admin']),
  async (req, res) => {
    try {
      const instituteCode = resolveInstituteCode(req);
      if (!instituteCode) {
        return res.status(400).json({ success: false, message: 'Institute code is required.' });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const page = parseInt(req.query.page, 10) || 1;

      const result = await issuerService.listBatchesForInstitute(instituteCode, { limit, page });
      return res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to list batches: %s', error.message);
      return res.status(500).json({ success: false, message: 'Failed to list batches' });
    }
  }
);

router.get(
  '/batches/:batchId',
  auth(['institute', 'admin']),
  async (req, res) => {
    try {
      const batch = await issuerService.getBatchById(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }

      return res.json({ success: true, data: batch });
    } catch (error) {
      logger.error('Failed to fetch batch %s: %s', req.params.batchId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch batch details' });
    }
  }
);

router.post(
  '/batches/:batchId/reanchor',
  auth(['institute', 'institution']),
  async (req, res) => {
    try {
      const instituteCode = resolveInstituteCode(req);
      if (!instituteCode) {
        return res.status(400).json({ success: false, message: 'Institute code is required.' });
      }

      const result = await issuerService.reanchorBatch(req.params.batchId, instituteCode);
      if (!result || result.success === false) {
        return res.status(500).json({ success: false, message: 'Failed to re-anchor batch', data: result });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to re-anchor batch %s: %s', req.params.batchId, error.message);
      return res.status(500).json({ success: false, message: 'Failed to re-anchor batch' });
    }
  }
);

module.exports = router;
