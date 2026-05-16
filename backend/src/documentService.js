import crypto from 'node:crypto';
import pdfParse from 'pdf-parse';
import { Storage } from '@google-cloud/storage';
import { config } from './config.js';
import { badRequest } from './errors.js';
import { FieldValue, serializeDocument } from './firestore.js';
import { caseDocumentsCollection, getCaseById, setCaseStatus } from './casesRepository.js';
import { validateUploadFile } from './validation.js';

const storage = new Storage({ projectId: config.projectId });
const bucket = storage.bucket(config.bucketName);

export async function uploadDocuments(caseId, files) {
  await getCaseById(caseId);

  if (!files?.length) throw badRequest('Upload at least one document.');

  const savedDocuments = [];

  for (const file of files) {
    validateUploadFile(file, config.maxUploadBytes);

    const documentId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(file.originalname);
    const storagePath = `cases/${caseId}/${documentId}-${safeFileName}`;
    const extractedText = await extractText(file);
    const docRef = caseDocumentsCollection(caseId).doc(documentId);

    await bucket.file(storagePath).save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          caseId,
          documentId,
          originalFileName: file.originalname
        }
      }
    });

    await docRef.set({
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath: `gs://${config.bucketName}/${storagePath}`,
      extractedText,
      extractedTextPreview: previewText(extractedText),
      extractionStatus: extractedText ? 'complete' : 'empty',
      uploadedAt: FieldValue.serverTimestamp()
    });

    savedDocuments.push(publicDocument(serializeDocument(await docRef.get())));
  }

  await setCaseStatus(caseId, 'documents_uploaded');

  return savedDocuments;
}

export async function listDocuments(caseId) {
  await getCaseById(caseId);

  const snapshot = await caseDocumentsCollection(caseId).orderBy('uploadedAt', 'desc').get();
  return snapshot.docs.map((doc) => publicDocument(serializeDocument(doc)));
}

export async function documentsForAnalysis(caseId) {
  const snapshot = await caseDocumentsCollection(caseId).orderBy('uploadedAt', 'asc').get();
  return snapshot.docs.map(serializeDocument).filter((doc) => doc.extractedText);
}

async function extractText(file) {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const result = await pdfParse(file.buffer);
    return normalizeWhitespace(result.text);
  }

  return normalizeWhitespace(file.buffer.toString('utf8'));
}

function previewText(text) {
  if (!text) return '';
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function normalizeWhitespace(value) {
  return value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
}

function publicDocument(document) {
  delete document.extractedText;
  return document;
}
