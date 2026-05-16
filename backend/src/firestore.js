import { FieldValue, Firestore } from '@google-cloud/firestore';
import { config } from './config.js';

export const firestore = new Firestore({
  projectId: config.projectId
});

export { FieldValue };

export function serializeDocument(snapshot) {
  if (!snapshot.exists) return null;
  return {
    id: snapshot.id,
    ...serializeValue(snapshot.data())
  };
}

export function serializeValue(value) {
  if (!value) return value;
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeValue(nested)]));
  }
  return value;
}
