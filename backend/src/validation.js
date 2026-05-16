import { badRequest } from './errors.js';

const DISPUTE_TYPES = new Set([
  'late_contribution',
  'missed_payout',
  'fine_or_penalty',
  'loan_repayment',
  'record_mismatch',
  'other'
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.csv', '.txt']);

export function validateCasePayload(payload) {
  const errors = [];
  const chamaName = cleanString(payload.chamaName);
  const disputeType = cleanString(payload.disputeType);
  const disputeDescription = cleanString(payload.disputeDescription);
  const members = normalizeMembers(payload.members);

  if (!chamaName) errors.push('chamaName is required.');
  if (!disputeType) errors.push('disputeType is required.');
  if (disputeType && !DISPUTE_TYPES.has(disputeType)) {
    errors.push(`disputeType must be one of: ${Array.from(DISPUTE_TYPES).join(', ')}.`);
  }
  if (!disputeDescription) errors.push('disputeDescription is required.');
  if (disputeDescription && disputeDescription.length < 20) {
    errors.push('disputeDescription should be at least 20 characters.');
  }

  if (errors.length) throw badRequest('Invalid case payload.', errors);

  return {
    chamaName,
    disputeType,
    disputeDescription,
    members
  };
}

export function validateCasePatchPayload(payload) {
  const patch = {};

  if (Object.hasOwn(payload, 'chamaName')) patch.chamaName = cleanString(payload.chamaName);
  if (Object.hasOwn(payload, 'disputeType')) patch.disputeType = cleanString(payload.disputeType);
  if (Object.hasOwn(payload, 'disputeDescription')) {
    patch.disputeDescription = cleanString(payload.disputeDescription);
  }
  if (Object.hasOwn(payload, 'members')) patch.members = normalizeMembers(payload.members);
  if (Object.hasOwn(payload, 'status')) patch.status = cleanString(payload.status);

  if (patch.disputeType && !DISPUTE_TYPES.has(patch.disputeType)) {
    throw badRequest(`disputeType must be one of: ${Array.from(DISPUTE_TYPES).join(', ')}.`);
  }

  if (!Object.keys(patch).length) throw badRequest('No supported fields were provided.');

  return patch;
}

export function validateUploadFile(file, maxUploadBytes) {
  if (!file) throw badRequest('No file was uploaded.');
  if (file.size > maxUploadBytes) {
    throw badRequest(`File ${file.originalname} is too large. Maximum size is ${maxUploadBytes} bytes.`);
  }

  const extension = extensionFor(file.originalname);
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) && !ALLOWED_EXTENSIONS.has(extension)) {
    throw badRequest(`Unsupported file type for ${file.originalname}. Upload PDF, CSV, or TXT files.`);
  }
}

export function cleanString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeMembers(value) {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter(Boolean).slice(0, 20);
}

function extensionFor(fileName) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}
