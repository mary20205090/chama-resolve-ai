import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'chama-resolve-ai';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  projectId,
  bucketName: process.env.GCS_BUCKET || `${projectId}-chama-docs`,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiSecretName: process.env.GEMINI_SECRET_NAME || 'gemini-api-key',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
  maxFilesPerCaseUpload: Number(process.env.MAX_FILES_PER_CASE_UPLOAD || 5),
  maxAnalysisChars: Number(process.env.MAX_ANALYSIS_CHARS || 24000)
};

export function publicConfig() {
  return {
    env: config.env,
    projectId: config.projectId,
    bucketName: config.bucketName,
    geminiModel: config.geminiModel,
    hasGeminiCredentialConfig: Boolean(config.geminiApiKey || config.geminiSecretName),
    geminiSecretName: config.geminiApiKey ? undefined : config.geminiSecretName
  };
}
