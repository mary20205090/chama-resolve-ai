import { FieldValue, firestore, serializeDocument } from './firestore.js';
import { notFound } from './errors.js';

const CASES_COLLECTION = 'cases';

export async function createCase(payload) {
  const now = FieldValue.serverTimestamp();
  const docRef = firestore.collection(CASES_COLLECTION).doc();

  await docRef.set({
    ...payload,
    status: 'draft',
    recommendationSummary: '',
    confidenceLevel: '',
    createdAt: now,
    updatedAt: now
  });

  return getCaseById(docRef.id);
}

export async function listCases(limit = 25) {
  const snapshot = await firestore
    .collection(CASES_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(Number(limit) || 25, 100))
    .get();

  return snapshot.docs.map(serializeDocument);
}

export async function getCaseById(caseId) {
  const snapshot = await firestore.collection(CASES_COLLECTION).doc(caseId).get();
  const disputeCase = serializeDocument(snapshot);
  if (!disputeCase) throw notFound(`Case ${caseId} was not found.`);
  return disputeCase;
}

export async function updateCase(caseId, patch) {
  const docRef = firestore.collection(CASES_COLLECTION).doc(caseId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) throw notFound(`Case ${caseId} was not found.`);

  await docRef.update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp()
  });

  return getCaseById(caseId);
}

export async function setCaseStatus(caseId, status, extra = {}) {
  await firestore
    .collection(CASES_COLLECTION)
    .doc(caseId)
    .update({
      status,
      ...extra,
      updatedAt: FieldValue.serverTimestamp()
    });
}

export function caseDocumentsCollection(caseId) {
  return firestore.collection(CASES_COLLECTION).doc(caseId).collection('documents');
}

export function caseAnalysesCollection(caseId) {
  return firestore.collection(CASES_COLLECTION).doc(caseId).collection('analyses');
}
