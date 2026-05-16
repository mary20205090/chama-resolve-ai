# chama-resolve-ai

AI-powered chama dispute arbitrator that reviews bylaws, contribution records, and dispute evidence to suggest fair, evidence-based resolutions.

## Current MVP

The app has two services:

- `backend/`: Express API connected to Google Cloud Firestore, Cloud Storage, Secret Manager, and Gemini.
- `frontend/`: React/Vite workflow UI for creating cases, uploading evidence, running analysis, and viewing recommendations.

Backend Cloud Run URL:

```text
https://chama-resolve-api-497347116504.europe-west1.run.app
```

## What Users Upload

Upload all documents the AI should consider. This includes:

- Chama bylaws or constitution
- Contribution/payment records
- Dispute-specific evidence such as meeting minutes, waiver requests, receipts, or agreements

For the demo, use:

```text
docs/sample-bylaws.txt
docs/sample-contributions.csv
```

## Google Cloud Resources

Project:

```text
chama-resolve-ai
```

Firestore:

```text
projects/chama-resolve-ai/databases/(default)
```

Cloud Storage:

```text
gs://chama-resolve-ai-chama-docs
```

Secret Manager:

```text
gemini-api-key
```

Gemini model:

```text
gemini-2.5-flash
```

## Local Setup

Authenticate Google Cloud:

```bash
gcloud init
gcloud config set project chama-resolve-ai
gcloud auth application-default login
gcloud auth application-default set-quota-project chama-resolve-ai
```

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run Locally

Terminal 1:

```bash
cd backend
npm start
```

Backend checks:

```bash
curl http://localhost:8080/api
curl http://localhost:8080/api/health
```

Terminal 2:

```bash
cd frontend
npm run dev -- --port 5173
```

Open:

```text
http://localhost:5173/
```

If the backend URL changes, create `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
```

## Demo Smoke Test

1. Open `http://localhost:5173/`.
2. Create a case:
   - Chama: `Umoja Demo Chama`
   - Type: `Late contribution`
   - Members: `Amina, Brian`
   - Dispute: `Brian paid his April contribution after the deadline and disputes the KES 200 late payment fine.`
3. Upload:
   - `docs/sample-bylaws.txt`
   - `docs/sample-contributions.csv`
4. Click `Analyze`.
5. Confirm the recommendation panel shows:
   - dispute summary
   - relevant bylaws
   - record findings
   - missing evidence
   - fairness analysis
   - recommended resolution
   - risks
   - next steps
   - advisory disclaimer

## Backend API

```text
GET    /api
GET    /api/health
POST   /api/cases
GET    /api/cases
GET    /api/cases/:caseId
PATCH  /api/cases/:caseId
POST   /api/cases/:caseId/documents
GET    /api/cases/:caseId/documents
POST   /api/cases/:caseId/analyze
GET    /api/cases/:caseId/analysis
```

Create a case:

```bash
curl -X POST http://localhost:8080/api/cases \
  -H 'Content-Type: application/json' \
  -d '{
    "chamaName": "Umoja Demo Chama",
    "disputeType": "late_contribution",
    "disputeDescription": "A member paid their monthly contribution after the deadline and disputes whether the late payment fine should apply.",
    "members": ["Amina", "Brian"]
  }'
```

Upload evidence:

```bash
curl -X POST http://localhost:8080/api/cases/CASE_ID/documents \
  -F "documents=@../docs/sample-bylaws.txt" \
  -F "documents=@../docs/sample-contributions.csv"
```

Run analysis:

```bash
curl -X POST http://localhost:8080/api/cases/CASE_ID/analyze
```

## Deploy Backend

Deploy backend first because the frontend needs the backend URL.

```bash
cd backend
gcloud run deploy chama-resolve-api \
  --source . \
  --project chama-resolve-ai \
  --region europe-west1 \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars=GCP_PROJECT_ID=chama-resolve-ai,GCS_BUCKET=chama-resolve-ai-chama-docs,GEMINI_MODEL=gemini-2.5-flash \
  --quiet
```

If deployment fails with Secret Manager permission errors, grant the Cloud Run runtime service account access:

```bash
gcloud secrets add-iam-policy-binding gemini-api-key \
  --project chama-resolve-ai \
  --member serviceAccount:497347116504-compute@developer.gserviceaccount.com \
  --role roles/secretmanager.secretAccessor
```

Test deployed backend:

```bash
curl https://chama-resolve-api-497347116504.europe-west1.run.app/api/health
```

## Deploy Frontend

The frontend is a static Vite app served by `frontend/server.js`. Cloud Run requires the service to listen on the `PORT` environment variable, so the frontend package has:

```text
gcp-build -> npm run build
start -> node server.js
```

Deploy:

```bash
cd frontend
gcloud run deploy chama-resolve-web \
  --source . \
  --project chama-resolve-ai \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-build-env-vars=VITE_API_BASE_URL=https://chama-resolve-api-497347116504.europe-west1.run.app/api \
  --quiet
```

## Troubleshooting

If `npm start` fails with `EADDRINUSE`, the backend is already running on port `8080`. Stop the old process or use another port:

```bash
PORT=8081 npm start
```

If the frontend is blank, check the browser console first. Then restart Vite and hard refresh:

```bash
cd frontend
npm run dev -- --port 5173
```

```text
Ctrl + Shift + R
```

If Cloud Run frontend deploy fails with `container failed to start and listen on PORT=8080`, confirm `frontend/package.json` has a `start` script and that `frontend/server.js` exists.

## Verification

Run before committing:

```bash
cd backend
npm test

cd ../frontend
npm run build
```

Current known dependency note:

```text
npm audit --omit=dev in backend reports low-severity findings through @google-cloud/storage's dependency chain. The forced npm fix downgrades Storage, so it has not been applied.
```
