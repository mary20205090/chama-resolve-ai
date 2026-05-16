# chama-resolve-ai
AI-powered chama dispute arbitrator that reviews bylaws and contribution records to suggest fair, evidence-based resolutions.

## Backend MVP

The backend API lives in `backend/` and connects to the Google Cloud project `chama-resolve-ai`.

### Prerequisites

- Google Cloud CLI authenticated with `gcloud init`
- Application Default Credentials configured:

  ```bash
  gcloud auth application-default login
  gcloud auth application-default set-quota-project chama-resolve-ai
  ```

- Firestore database created
- Cloud Storage bucket created:

  ```text
  gs://chama-resolve-ai-chama-docs
  ```

- Gemini API key stored privately. The backend can read `gemini-api-key` from Secret Manager through ADC. For local override, create `backend/.env.local` from `backend/.env.example` and add the key there.

### Run Locally

```bash
cd backend
npm install
npm start
```

Health check:

```bash
curl http://localhost:8080/api/health
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

Run analysis after Secret Manager or `GEMINI_API_KEY` is configured:

```bash
curl -X POST http://localhost:8080/api/cases/CASE_ID/analyze
```

## Frontend MVP

The frontend app lives in `frontend/` and talks to the backend API.

Run locally:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/
```

If the backend is running somewhere else, create `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
```
