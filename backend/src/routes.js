import express from 'express';
import multer from 'multer';
import { config, publicConfig } from './config.js';
import { asyncHandler } from './errors.js';
import { analyzeCase, latestAnalysis } from './analysisService.js';
import { createCase, getCaseById, listCases, updateCase } from './casesRepository.js';
import { listDocuments, uploadDocuments } from './documentService.js';
import { validateCasePatchPayload, validateCasePayload } from './validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: config.maxFilesPerCaseUpload
  }
});

export function createRouter() {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'chama-resolve-api',
      config: publicConfig()
    });
  });

  router.post(
    '/cases',
    asyncHandler(async (req, res) => {
      const payload = validateCasePayload(req.body);
      const disputeCase = await createCase(payload);
      res.status(201).json({ case: disputeCase });
    })
  );

  router.get(
    '/cases',
    asyncHandler(async (req, res) => {
      const cases = await listCases(req.query.limit);
      res.json({ cases });
    })
  );

  router.get(
    '/cases/:caseId',
    asyncHandler(async (req, res) => {
      const disputeCase = await getCaseById(req.params.caseId);
      res.json({ case: disputeCase });
    })
  );

  router.patch(
    '/cases/:caseId',
    asyncHandler(async (req, res) => {
      const patch = validateCasePatchPayload(req.body);
      const disputeCase = await updateCase(req.params.caseId, patch);
      res.json({ case: disputeCase });
    })
  );

  router.post(
    '/cases/:caseId/documents',
    upload.array('documents', config.maxFilesPerCaseUpload),
    asyncHandler(async (req, res) => {
      const documents = await uploadDocuments(req.params.caseId, req.files);
      res.status(201).json({ documents });
    })
  );

  router.get(
    '/cases/:caseId/documents',
    asyncHandler(async (req, res) => {
      const documents = await listDocuments(req.params.caseId);
      res.json({ documents });
    })
  );

  router.post(
    '/cases/:caseId/analyze',
    asyncHandler(async (req, res) => {
      const analysis = await analyzeCase(req.params.caseId);
      res.status(201).json({ analysis });
    })
  );

  router.get(
    '/cases/:caseId/analysis',
    asyncHandler(async (req, res) => {
      const analysis = await latestAnalysis(req.params.caseId);
      res.json({ analysis });
    })
  );

  return router;
}
