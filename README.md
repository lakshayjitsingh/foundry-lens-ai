# FoundryLens AI — Microsoft Foundry Multimodal Document Auditor & Responsible AI Agent

> **Course / Certification Project:** Microsoft Certified: Azure AI Fundamentals (**AI-901**)  
> **Architecture:** Compact, viva-ready full-stack project (4 Python backend modules + 6 React TypeScript components) with a warm Sunset-Orange & Cream **Dark/Light** glassmorphic UI, demonstrating **100% of AI-901 Domain 1 & Domain 2 objectives**.

---

## Architecture Overview

```text
User Input (Image / PDF / Receipt / Notice)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  1. Responsible AI Pre-Flight (backend/responsible_ai.py)│
│     • Prompt Shield & Content Safety Scanner             │
│     • Privacy Shield PII Redactor (Email/Phone/ID/PAN)   │
└──────────────────────────┬───────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│  2. Microsoft Foundry SDK (backend/foundry_client.py)    │
│     • azure-ai-inference (ChatCompletionsClient)         │
│     • Model Catalog: GPT-4o mini, Phi-4, Llama-3.3-70B   │
│     • Multimodal Content Understanding (Text + Vision)   │
│     • Single-Agent Tool Calling Loop (ToolMessage)       │
└──────────────────────────┬───────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│  3. Verification & Transparency (Frontend Workspace)     │
│     • Deterministic Math Auditor Tool (Catches Overcharge│
│       & OCR/LLM Arithmetic Hallucinations)               │
│     • Microsoft 6 Responsible AI Pillars Scorecard       │
│     • Inspectable SystemMessage vs. UserMessage Prompts  │
│     • Speech Read-Aloud (Inclusiveness) + JSON Audit Log │
└──────────────────────────────────────────────────────────┘
```

---

## AI-901 Exam Syllabus Mapping (Viva Quick Reference)

| AI-901 Domain | Official Skill Measured | Implemented In |
| :--- | :--- | :--- |
| **Domain 1 (40–45%)** | **Responsible AI (All 6 Principles):** Privacy & Security, Reliability & Safety, Transparency, Inclusiveness, Fairness, Accountability | `backend/responsible_ai.py`, `frontend/src/components/AuditWorkspace.tsx` |
| **Domain 1 (40–45%)** | **Core AI Workloads:** Vision (image data URLs), NLP / Content Understanding (structured JSON extraction), Speech (Web Speech read-aloud), Generative AI (LLMs & SLMs) | `backend/main.py`, `backend/foundry_client.py`, `frontend/src/components/DocumentIntake.tsx` |
| **Domain 2 (55–60%)** | **Microsoft Foundry SDK & Model Catalog:** `ChatCompletionsClient`, `AzureKeyCredential`, model selection (`gpt-4o-mini`, `Phi-4`, `Llama-3.3-70B-Instruct`), temperature & token telemetry | `backend/foundry_client.py` |
| **Domain 2 (55–60%)** | **Prompt Engineering:** Strict separation of `SystemMessage` (JSON schema & neutrality guardrails) vs. `UserMessage` (`TextContentItem` + `ImageContentItem`), inspectable live in UI | `backend/foundry_client.py`, `AuditWorkspace.tsx` |
| **Domain 2 (55–60%)** | **Single-Agent Tool Calling & Grounding:** Registers `ChatCompletionsToolDefinition` tools (`verify_line_item_totals`, `scan_and_redact_pii`) with `AssistantMessage → ToolMessage` execution trace + Prompt Injection blocking | `backend/foundry_client.py`, `frontend/src/components/GroundedChat.tsx` |

---

## Quick Start (Local Development)

### 1. Backend (Python FastAPI + Microsoft Foundry SDK)
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## Connecting Live Microsoft Foundry (\$0 Cost Options)

FoundryLens AI runs immediately in **Offline Deterministic Demo Mode** with zero API keys (so college demos/vivas never break if Wi-Fi drops). To switch to **live cloud inference**, set **either** option in `backend/.env`:

1. **Option A — Microsoft Foundry (Azure for Students — \$100 free credit, no card required):**
   ```env
   AZURE_FOUNDRY_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/models
   AZURE_FOUNDRY_KEY=<your-azure-key>
   ```
2. **Option B — GitHub Models (Free Azure-Hosted Microsoft Foundry Catalog):**
   ```env
   GITHUB_TOKEN=<your-github-personal-access-token>
   ```
   Uses `https://models.github.ai/inference` with the exact same `azure-ai-inference` SDK.

---

## Automated Verification

```bash
# Backend unit & API tests (PII masking, Prompt Shield, math discrepancy detection, grounded agent)
cd backend && .venv\Scripts\pytest.exe -v

# Frontend strict TypeScript check + production bundle
cd frontend && npm run build
```

---

## Deployment (Render + Vercel)
- **Render (Full-Stack or Backend API):** Included [`render.yaml`](render.yaml) builds the React bundle and serves both `/api/*` and the UI from FastAPI.
- **Vercel (Frontend):** Included [`vercel.json`](vercel.json) builds `frontend/dist`. Set `VITE_API_BASE_URL` in Vercel environment variables to your Render service URL.
