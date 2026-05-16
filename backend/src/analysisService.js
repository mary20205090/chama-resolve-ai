import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import { badRequest, HttpError } from './errors.js';
import { FieldValue, serializeDocument } from './firestore.js';
import { caseAnalysesCollection, getCaseById, setCaseStatus } from './casesRepository.js';
import { documentsForAnalysis } from './documentService.js';
import { getGeminiApiKey } from './secretService.js';

const PROMPT_VERSION = '2026-05-16-v1';

export async function analyzeCase(caseId) {
  const geminiApiKey = await getGeminiApiKey();

  if (!geminiApiKey) {
    throw new HttpError(503, 'GEMINI_API_KEY is not configured for the backend.');
  }

  const disputeCase = await getCaseById(caseId);
  const documents = await documentsForAnalysis(caseId);

  if (!documents.length) {
    throw badRequest('Upload at least one readable PDF, CSV, or TXT document before analysis.');
  }

  await setCaseStatus(caseId, 'analysis_pending');

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const prompt = buildPrompt(disputeCase, documents);
  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt
  });

  const rawText = response.text || '';
  const result = parseGeminiJson(rawText);
  const analysis = normalizeAnalysisResult(result);
  const docRef = caseAnalysesCollection(caseId).doc();

  await docRef.set({
    ...analysis,
    model: config.geminiModel,
    promptVersion: PROMPT_VERSION,
    inputDocumentIds: documents.map((document) => document.id),
    createdAt: FieldValue.serverTimestamp()
  });

  await setCaseStatus(caseId, 'analysis_complete', {
    recommendationSummary: analysis.recommendedResolution,
    confidenceLevel: analysis.confidenceLevel
  });

  return publicAnalysis(serializeDocument(await docRef.get()));
}

export async function latestAnalysis(caseId) {
  await getCaseById(caseId);

  const snapshot = await caseAnalysesCollection(caseId).orderBy('createdAt', 'desc').limit(1).get();
  if (snapshot.empty) return null;
  return publicAnalysis(serializeDocument(snapshot.docs[0]));
}

function buildPrompt(disputeCase, documents) {
  const documentText = documents
    .map((document, index) => {
      const text = document.extractedText.slice(0, Math.floor(config.maxAnalysisChars / documents.length));
      return `DOCUMENT ${index + 1}: ${document.fileName}\n${text}`;
    })
    .join('\n\n---\n\n');

  return `You are an impartial chama dispute resolution assistant.

Your task is to review chama bylaws, contribution records, and the dispute description.

Rules:
- Do not invent facts.
- Cite exact evidence used when possible.
- If evidence is missing or unclear, say so.
- Give an advisory recommendation, not a legal ruling.
- Be fair to all members.
- Prefer practical next steps that a chama committee can act on.
- Do not reveal private personal data unless necessary to explain the recommendation.
- Return valid JSON only. Do not wrap it in Markdown.

Dispute case:
${JSON.stringify(
  {
    id: disputeCase.id,
    chamaName: disputeCase.chamaName,
    disputeType: disputeCase.disputeType,
    disputeDescription: disputeCase.disputeDescription,
    members: disputeCase.members
  },
  null,
  2
)}

Evidence documents:
${documentText}

Return JSON with this exact shape:
{
  "disputeSummary": "string",
  "relevantBylaws": ["string"],
  "recordFindings": ["string"],
  "missingEvidence": ["string"],
  "fairnessAnalysis": "string",
  "recommendedResolution": "string",
  "confidenceLevel": "low | medium | high",
  "risks": ["string"],
  "nextSteps": ["string"],
  "disclaimer": "This is an advisory recommendation and not a legal ruling."
}`;
}

function parseGeminiJson(rawText) {
  const text = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new HttpError(502, 'Gemini returned a response that was not valid JSON.', {
      rawText: rawText.slice(0, 1000)
    });
  }
}

function normalizeAnalysisResult(result) {
  return {
    disputeSummary: stringValue(result.disputeSummary),
    relevantBylaws: stringArray(result.relevantBylaws),
    recordFindings: stringArray(result.recordFindings),
    missingEvidence: stringArray(result.missingEvidence),
    fairnessAnalysis: stringValue(result.fairnessAnalysis),
    recommendedResolution: stringValue(result.recommendedResolution),
    confidenceLevel: confidenceValue(result.confidenceLevel),
    risks: stringArray(result.risks),
    nextSteps: stringArray(result.nextSteps),
    disclaimer:
      stringValue(result.disclaimer) || 'This is an advisory recommendation and not a legal ruling.'
  };
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter(Boolean);
}

function confidenceValue(value) {
  const normalized = stringValue(value).toLowerCase();
  return ['low', 'medium', 'high'].includes(normalized) ? normalized : 'low';
}

function publicAnalysis(analysis) {
  delete analysis.rawModelText;
  return analysis;
}
