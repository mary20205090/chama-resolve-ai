import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from './config.js';
import { HttpError } from './errors.js';

let cachedGeminiApiKey = '';

export async function getGeminiApiKey() {
  if (config.geminiApiKey) return config.geminiApiKey;
  if (cachedGeminiApiKey) return cachedGeminiApiKey;
  if (!config.geminiSecretName) return '';

  const client = new SecretManagerServiceClient({
    projectId: config.projectId
  });

  const secretVersionName = `projects/${config.projectId}/secrets/${config.geminiSecretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name: secretVersionName });
    cachedGeminiApiKey = version.payload?.data?.toString('utf8')?.trim() || '';
    return cachedGeminiApiKey;
  } catch (error) {
    throw new HttpError(503, `Could not read Secret Manager secret ${config.geminiSecretName}.`, {
      secretVersionName,
      reason: error.message
    });
  }
}
