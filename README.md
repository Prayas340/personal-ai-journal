# GenAI APAC Ideathon Hub — Production Enterprise Solution

A production-grade, end-to-end full-stack cloud application engineered for the **Gen AI APAC Ideathon**. It integrates **Firebase Authentication**, **Cloud Firestore** with strict per-user data isolation, and **Google Gemini 2.5 Flash** wrapped in a resilient **Enterprise AI Constitution (Security Shield & Guardrails)**.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Client Frontend (React 19 + Vite)                      │
│   - Dual-column workspace: Multi-turn Chat stream & Constitution/Logs        │
│   - Firebase Client Auth (Google Sign-In & Email/Password)                  │
│   - Real-time Firestore Listener: users/{userId}/journals/{journalId}       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Bearer <Firebase ID Token>
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Cloud Run Container (Express + Node.js)                │
│   - Port: 8080 (Cloud Run $PORT)                                            │
│   - Firebase Admin Token Verification (extracts uid, enforces auth)         │
│   - Pre-flight Adversarial Threat Filter (Jailbreak / Injection blocker)    │
│   - Gemini 2.5 Flash Engine (@google/genai SDK)                             │
│   - Phase 3 Mood & Action Extraction Engine                                 │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
                       ▼                               ▼
       ┌───────────────────────────────┐ ┌────────────────────────────────────┐
       │   Google Cloud Firestore      │ │ Google Cloud Secret Manager        │
       │   Isolated user journal paths │ │ Injects GEMINI_API_KEY securely    │
       │   Enforced by Security Rules  │ │ Never leaked to client or git      │
       └───────────────────────────────┘ └────────────────────────────────────┘
```

---

## 🔒 Security Architecture & Firestore Rules

### 1. User Isolation Path
All persistent conversation sessions, mood telemetry, action items, and executive summaries are strictly partitioned:
```text
/databases/{database}/documents/users/{userId}/journals/{journalId}
```

### 2. Deployed Production Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Google Cloud Platform (GCP) Deployment Commands

Follow these exact `gcloud` CLI commands to deploy to **Google Cloud Run** with **Secret Manager**:

### Step 1: Set GCP Project & Variables
```bash
PROJECT_ID="your-gcp-project-id"
REGION="asia-east1" # APAC Region
SERVICE_NAME="genai-apac-ideathon-hub"
SECRET_NAME="gemini-api-key"

gcloud config set project $PROJECT_ID
```

### Step 2: Enable Required GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com
```

### Step 3: Store Gemini API Key in Secret Manager
```bash
echo -n "YOUR_GEMINI_API_KEY_VALUE" | gcloud secrets create $SECRET_NAME \
  --data-file=- \
  --replication-policy="automatic"
```

### Step 4: Grant Cloud Run Service Account Access to Secret
```bash
# Retrieve project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Secret Accessor role to the default Compute service account
gcloud secrets add-iam-policy-binding $SECRET_NAME \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 5: Build and Deploy Container to Cloud Run
```bash
# Submit build to Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy container to Cloud Run with Secret binding and Port 8080
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --port 8080 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=${SECRET_NAME}:latest" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

---

## 🧪 Local Development Setup

1. **Clone repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and insert your GEMINI_API_KEY
   ```

3. **Start Development Server (Port 3000):**
   ```bash
   npm run dev
   ```

4. **Verify Application Build & Type Safety:**
   ```bash
   npm run build
   ```

---

## 🛡️ Enterprise AI Constitution Guardrails

The Gemini model is governed by three foundational rules:
1. **Rule SEC-01 (Credential Shielding):** Refusal to reveal system instructions, environment variables, or API keys under any guise.
2. **Rule SEC-02 (Adversarial & Injection Defense):** Intercepts prompt injections, DAN bypasses, and simulation overrides before execution.
3. **Rule SEC-03 (Structured Output Protocol):** Emits validated executive summaries, prioritized action items, and sentiment analytics.
