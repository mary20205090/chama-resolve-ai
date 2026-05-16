# Chama Resolve AI Implementation Plan

This plan starts from the current team status:

- BwAI Agentathon Google Cloud credits have already been redeemed.
- The credited billing account is linked to the default Google Cloud project.
- A Google/Gemini API key has already been created for that credited project.

Important: do not paste the API key into this repository, screenshots, chat, or frontend code. Keep it server-side only.

## 1. Recommended MVP Direction

For the hackathon MVP, use the API key you already created and call Gemini from the backend only.

Recommended stack:

- Frontend: Next.js or React
- Backend API: Node.js/Express or FastAPI
- AI: Gemini API using the existing server-side API key
- Database: Firestore in Native mode
- File storage: Cloud Storage
- Deployment: Cloud Run
- Secret storage: Secret Manager

Why this path:

- It uses the credited project you already set up.
- It is faster than wiring a full IAM/Vertex AI service-account flow during the hackathon.
- It keeps the key away from the browser.
- It can later be migrated to Vertex AI with Application Default Credentials when the app becomes more production-grade.

## 2. Project Setup Checklist

1. Confirm the active Google Cloud project.

   ```bash
   gcloud auth login
   gcloud config list project
   ```

2. If needed, set the credited project explicitly.

   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud config set run/region europe-west1
   ```

   `europe-west1` is a reasonable default for Nairobi latency and service availability. If a required service is unavailable there, use `us-central1`.

3. Set up local Application Default Credentials for Firestore and Cloud Storage access.

   ```bash
   gcloud auth application-default login
   gcloud auth application-default set-quota-project YOUR_PROJECT_ID
   ```

   The Gemini API key handles the model call. Firestore and Cloud Storage still need Google Cloud authentication when running locally.

4. Confirm billing and credits.

   In Google Cloud Console:

   - Go to `Billing`.
   - Confirm the project is linked to `Google Cloud Platform Trial Billing Account`.
   - Go to `Billing > Credits`.
   - Confirm the trial/event credits are visible.

5. Enable required APIs.

   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable firestore.googleapis.com
   gcloud services enable storage.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable generativelanguage.googleapis.com
   ```

6. Optional production path: also enable Vertex AI.

   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

   Use this later if the team switches from API-key auth to Vertex AI with Application Default Credentials or a Cloud Run service identity.

## 3. API Key Handling

Use one environment variable name across the backend:

```text
GEMINI_API_KEY
```

For local development, place it in a local-only env file such as `backend/.env.local`. That file must be ignored by git.

Example local env:

```bash
GEMINI_API_KEY=PASTE_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
GCP_PROJECT_ID=YOUR_PROJECT_ID
GCS_BUCKET=YOUR_PROJECT_ID-chama-docs
```

For Cloud Run, store the key in Secret Manager:

```bash
gcloud secrets create gemini-api-key --replication-policy=automatic
gcloud secrets versions add gemini-api-key --data-file=/path/to/local/key-file.txt
```

Keep the temporary key file outside the repository. After adding the secret, delete the local key file if one was created only for setup.

Security rules:

- Never expose the key in frontend JavaScript.
- Never commit `.env`, `.env.local`, service account JSON files, or API key text files.
- Confirm the key belongs to the same credited project before testing paid or high-quota calls.
- Restrict the key to the Gemini/Generative Language API where possible.
- Use only one key variable. Prefer `GEMINI_API_KEY`.
- Rotate the key if it is accidentally exposed.

## 4. Cloud Resources to Create

Create Firestore in Native mode:

```bash
gcloud firestore databases create --location=europe-west1
```

Create a private Cloud Storage bucket for uploaded evidence:

```bash
gcloud storage buckets create gs://YOUR_PROJECT_ID-chama-docs --location=europe-west1
```

Store uploaded files by case:

```text
gs://YOUR_PROJECT_ID-chama-docs/cases/{caseId}/{documentId}-{originalFileName}
```

MVP storage rules:

- Maximum upload size: 10 MB per file
- First build allowed file types: PDF, CSV, TXT
- Optional image file types after OCR is added: PNG, JPG
- Bucket must stay private
- Generate signed URLs only if the frontend needs temporary document access
- Prefer extracted text in Firestore previews instead of public document links

## 5. Cloud Run IAM Notes

Cloud Run needs permission to read secrets, write Firestore documents, and write Cloud Storage objects. In many hackathon projects the default service account may already work, but least-privilege roles are cleaner.

If the backend deploys but cannot access resources, grant the Cloud Run runtime service account:

```text
roles/secretmanager.secretAccessor
roles/datastore.user
roles/storage.objectAdmin
```

Only add `roles/aiplatform.user` if the team switches to Vertex AI instead of the Gemini API key path.

## 6. Repository Structure

Recommended first structure:

```text
frontend/
  User interface for creating disputes and viewing AI recommendations

backend/
  API for cases, uploads, document parsing, AI analysis, and case history

docs/
  Notes, prompts, sample bylaws, and sample contribution records
```

Backend-first order is best because uploads, database writes, and AI calls are the risky pieces.

## 7. Core User Flow

1. User creates a dispute case.
2. User enters chama name, member names, dispute type, and dispute description.
3. User uploads supporting documents:
   - chama bylaws or constitution
   - contribution/payment records
   - meeting minutes or written agreements, if available
4. Backend validates and stores uploaded files in Cloud Storage.
5. Backend extracts text from uploaded documents.
6. Backend stores case and document metadata in Firestore.
7. Backend sends structured evidence to Gemini.
8. Gemini returns an advisory resolution.
9. Backend validates and saves the AI result.
10. Frontend displays the summary, evidence references, recommendation, risks, missing evidence, and next steps.

## 8. MVP Feature Checklist

Build these first:

- Case creation form
- Upload support for PDF, CSV, and TXT
- File size and file type validation
- Firestore case records
- Cloud Storage upload storage
- Text extraction for uploaded documents
- AI analysis endpoint
- Result page with recommendation and evidence summary
- Case history page
- Advisory disclaimer on every recommendation

Stretch features:

- Member login
- Admin/member roles
- Export recommendation as PDF
- Swahili/English output toggle
- PNG/JPG upload with OCR
- WhatsApp-ready summary
- Confidence scoring based on evidence completeness
- Manual reviewer notes

## 9. Firestore Data Model

Suggested collections:

```text
cases/{caseId}
  chamaName
  disputeType
  disputeDescription
  members
  status
  createdBy
  createdAt
  updatedAt
  recommendationSummary
  confidenceLevel

cases/{caseId}/documents/{documentId}
  fileName
  fileType
  fileSize
  storagePath
  extractedTextPreview
  extractionStatus
  uploadedAt

cases/{caseId}/analyses/{analysisId}
  model
  promptVersion
  inputDocumentIds
  disputeSummary
  relevantBylaws
  recordFindings
  missingEvidence
  fairnessAnalysis
  recommendedResolution
  confidenceLevel
  risks
  nextSteps
  disclaimer
  createdAt
```

Suggested statuses:

```text
draft
documents_uploaded
analysis_pending
analysis_complete
analysis_failed
closed
```

## 10. Backend API Endpoints

Suggested endpoints:

```text
GET    /health
POST   /cases
GET    /cases
GET    /cases/{caseId}
PATCH  /cases/{caseId}
POST   /cases/{caseId}/documents
GET    /cases/{caseId}/documents
POST   /cases/{caseId}/analyze
GET    /cases/{caseId}/analysis
```

Minimum backend responsibilities:

- Validate request body fields
- Validate uploads before storing them
- Upload evidence documents to Cloud Storage
- Extract document text
- Store case and document metadata in Firestore
- Call Gemini using `GEMINI_API_KEY`
- Validate the AI output shape before saving it
- Return clear user-friendly errors
- Avoid logging private document contents or API keys

## 11. AI Analysis Contract

The backend should call Gemini with structured data, not a loose one-line prompt.

Prompt shape:

```text
You are an impartial chama dispute resolution assistant.

Your task is to review chama bylaws, contribution records, and the dispute description.

Rules:
- Do not invent facts.
- Cite the exact evidence used when possible.
- If evidence is missing or unclear, say so.
- Give an advisory recommendation, not a legal ruling.
- Be fair to all members.
- Prefer practical next steps that a chama committee can act on.
- Do not reveal private personal data unless it is necessary to explain the recommendation.

Return JSON with:
- dispute_summary
- relevant_bylaws
- contribution_record_findings
- missing_evidence
- fairness_analysis
- recommended_resolution
- confidence_level
- risks
- next_steps
- disclaimer
```

Expected backend response:

```json
{
  "disputeSummary": "...",
  "relevantBylaws": [],
  "recordFindings": [],
  "missingEvidence": [],
  "fairnessAnalysis": "...",
  "recommendedResolution": "...",
  "confidenceLevel": "low | medium | high",
  "risks": [],
  "nextSteps": [],
  "disclaimer": "This is an advisory recommendation and not a legal ruling."
}
```

Recommended model for MVP:

```text
gemini-2.5-flash
```

It should be fast and cost-conscious for a demo. If quality is not good enough, test a stronger Gemini model only for final runs.

## 12. Frontend Screens

Build the actual workflow as the first screen, not a marketing landing page.

Screens:

- Cases list
- New case form
- Case detail
- Upload documents panel
- Analysis/result view

Important UI states:

- Empty case list
- Upload in progress
- Invalid file type
- Analysis loading
- Missing evidence warning
- Failed AI analysis
- Successful recommendation

Result page should show:

- Dispute summary
- Documents considered
- Relevant bylaws
- Contribution record findings
- Missing evidence
- Fairness analysis
- Recommended resolution
- Next steps
- Advisory disclaimer

## 13. Local Development Steps

1. Scaffold the app.

   ```bash
   mkdir frontend backend docs
   ```

2. Add git ignores before adding secrets.

   ```text
   .env
   .env.local
   *.key
   *.pem
   *service-account*.json
   ```

3. Build backend first.
   - Add `/health`.
   - Add case create/read endpoints.
   - Add Firestore connection.
   - Add Cloud Storage upload.
   - Add document text extraction.
   - Add Gemini analysis using `GEMINI_API_KEY`.

4. Build frontend second.
   - Connect case form to backend.
   - Add upload panel.
   - Add case result page.
   - Add loading, error, and empty states.

5. Add sample data in `docs/`.
   - Sample chama bylaws
   - Sample contribution records
   - Sample disputes

6. Test with at least three dispute scenarios.
   - Late contribution dispute
   - Missed payout/share-out dispute
   - Fine/penalty disagreement

## 14. Deployment Steps

Deploy backend to Cloud Run with the API key coming from Secret Manager:

```bash
cd backend
gcloud run deploy chama-resolve-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars=GEMINI_MODEL=gemini-2.5-flash,GCP_PROJECT_ID=YOUR_PROJECT_ID,GCS_BUCKET=YOUR_PROJECT_ID-chama-docs
```

Deploy frontend to Cloud Run:

```bash
cd frontend
gcloud run deploy chama-resolve-web \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars=NEXT_PUBLIC_API_BASE_URL=YOUR_BACKEND_CLOUD_RUN_URL
```

For a hackathon demo, unauthenticated Cloud Run is acceptable if the app uses only sample data. For real chama data, add authentication before sharing.

## 15. Security and Privacy Requirements

- Do not commit API keys or service account keys.
- Do not call Gemini directly from the browser.
- Keep the API key in Secret Manager for Cloud Run.
- Keep Cloud Storage private.
- Prefer Application Default Credentials for future production Vertex AI access.
- Use Cloud Run service identity in production.
- Avoid uploading real member IDs, phone numbers, bank details, or ID numbers during demos.
- Redact sensitive information before sending extracted text to Gemini when possible.
- Add a visible advisory disclaimer on every recommendation.
- Log case IDs and status changes, not full dispute documents.

## 16. Cost Control

- Use Cloud Run because it can scale to zero.
- Keep upload limits small.
- Use `gemini-2.5-flash` for normal demo runs.
- Limit AI retries.
- Avoid repeated analysis calls for the same case unless documents changed.
- Delete test files after demos.
- Track spending under `Billing > Reports`.
- Set a budget alert if possible.

Suggested budget alert:

```text
Alert at 50%, 75%, and 90% of available trial credits.
```

## 17. Demo Script

1. Open the app.
2. Create a case called `Late Contribution Penalty`.
3. Upload sample bylaws.
4. Upload sample contribution CSV.
5. Enter a short dispute description.
6. Run AI analysis.
7. Show:
   - Evidence found
   - Missing evidence
   - Recommended fair resolution
   - Committee next steps
   - Advisory disclaimer

## 18. Implementation Risks and Fixes

Risk: API key is accidentally exposed.
Fix: backend-only calls, Secret Manager, git ignores, key restrictions, and rotation if exposed.

Risk: AI invents bylaw clauses.
Fix: prompt requires evidence citation, backend displays missing evidence, and the UI labels output as advisory.

Risk: uploaded records include sensitive personal data.
Fix: use sample data for demos and redact fields before model calls when possible.

Risk: the team promises image upload before OCR exists.
Fix: demo with PDF, CSV, and TXT first; treat PNG/JPG OCR as a stretch feature.

Risk: Cloud Run deploy works but backend cannot read the secret.
Fix: grant the Cloud Run service account Secret Manager access if needed.

Risk: project credits are linked to a different project than the API key.
Fix: confirm the key belongs to the same credited project before testing paid/high-quota API calls.

## 19. Official References

- Gemini API quickstart: https://ai.google.dev/gemini-api/docs/quickstart
- Gemini API key usage: https://ai.google.dev/gemini-api/docs/api-key
- Gemini API billing and Google Cloud credits: https://ai.google.dev/gemini-api/docs/billing
- Google Cloud API key best practices: https://cloud.google.com/docs/authentication/api-keys-best-practices
- Cloud Run deploy from source: https://cloud.google.com/run/docs/deploying-source-code
- Cloud Run secrets: https://cloud.google.com/run/docs/configuring/services/secrets
- Secret Manager quickstart: https://cloud.google.com/secret-manager/docs/create-secret-quickstart
- Firestore Native mode: https://cloud.google.com/firestore/native/docs
- Firestore database creation command: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Cloud Storage buckets: https://cloud.google.com/storage/docs/creating-buckets
