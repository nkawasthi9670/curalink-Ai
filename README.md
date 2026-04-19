# Curalink — AI Medical Research Assistant

> An intelligent, research-backed medical assistant that retrieves and synthesizes information from PubMed, OpenAlex, and ClinicalTrials.gov using an open-source LLM.

---

## Live Demo

- **Frontend:** https://curalink-ai-weld.vercel.app
- **Backend API:** https://curalink-ai-tagr.onrender.com

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas |
| LLM (Local) | Ollama + LLaMA 3.2 |
| LLM (Deployed) | Groq API — LLaMA3 8B |
| Research APIs | PubMed, OpenAlex, ClinicalTrials.gov |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Features

- Accepts structured patient input — name, disease, location
- Automatically expands queries with medical synonyms
- Retrieves 100–200 results in parallel from 3 sources
- Re-ranks results by relevance, recency, and credibility
- Generates structured AI responses with citations
- Maintains multi-turn conversation context via MongoDB
- Displays source cards with paper links and trial details
- Falls back gracefully if LLM is unavailable

---

## Project Structure

```
curalink/
├── curlink-backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── pubmed.js           # PubMed NCBI API
│   │   │   ├── openalex.js         # OpenAlex API
│   │   │   └── clinicaltrials.js   # ClinicalTrials.gov API
│   │   ├── utils/
│   │   │   ├── queryExpand.js      # Query expansion + synonyms
│   │   │   └── rerank.js           # Relevance scoring engine
│   │   ├── models/
│   │   │   └── Session.js          # MongoDB session schema
│   │   └── routes/
│   │       └── chat.js             # Main orchestration route
│   ├── index.js
│   └── .env
└── curalink-frontend/
    └── src/
        ├── App.js
        ├── components/
        │   ├── Sidebar.js          # Patient context form
        │   ├── ChatPanel.js        # Chat interface
        │   └── SourcesPanel.js     # Publications + trials display
        └── App.css
```

---

## AI Pipeline

```
User Query + Disease Context
        ↓
  Query Expansion (synonyms)
        ↓
Parallel Retrieval (Promise.allSettled)
  ├── PubMed      → up to 80 results
  ├── OpenAlex    → up to 100 results
  └── ClinicalTrials.gov → up to 50 trials
        ↓
Re-Ranking Engine
  ├── Relevance score  (40%)
  ├── Recency score    (30%)
  └── Credibility score (30%)
        ↓
Top 6 Publications + Top 4 Trials
        ↓
LLM Prompt (RAG)
  └── LLaMA3 via Groq API
        ↓
Structured Response
  ├── ## Overview
  ├── ## Research Insights [P1][P2]
  ├── ## Clinical Trials [T1]
  └── ## Key Takeaways
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free)
- Ollama installed — https://ollama.com

### 1. Clone and install

```bash
git clone https://github.com/nkawasthi/curalink-backend
cd curlink-backend
npm install
```

### 2. Configure environment

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb+srv://nikhilkumarawasthi11_db_user:curalink%401@cluster0.qeq13zn.mongodb.net/curlink?retryWrites=true&w=majority
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
USE_OLLAMA=true
```

### 3. Pull the LLM model

```bash
ollama pull llama3.2
```

### 4. Start the backend

```bash
# Terminal 1 — Ollama is already running in background on Windows
# Terminal 2 — Backend
npm run dev
```

### 5. Start the frontend

```bash
cd curalink-frontend
npm install
npm start
```

App runs at `http://localhost:3000`

---

## API Reference

### POST `/api/chat`

**Request:**
```json
{
  "sessionId": "unique-session-id",
  "message": "Latest treatment for deep brain stimulation",
  "context": {
    "disease": "Parkinson's disease",
    "patientName": "John Smith",
    "location": "Toronto, Canada"
  }
}
```

**Response:**
```json
{
  "sessionId": "unique-session-id",
  "response": "## Overview\n...",
  "sources": {
    "publications": [
      {
        "title": "...",
        "authors": ["..."],
        "year": 2024,
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/..."
      }
    ],
    "clinicalTrials": [
      {
        "nctId": "NCT...",
        "title": "...",
        "recruitingStatus": "RECRUITING",
        "phase": "Phase 3"
      }
    ]
  }
}
```

---

## Data Sources

| Source | Type | Results |
|---|---|---|
| PubMed (NCBI eUtils) | Research publications | Up to 80 |
| OpenAlex | Research publications | Up to 100 |
| ClinicalTrials.gov v2 | Clinical trials | Up to 50 |

---

## LLM Details

| Environment | Model | Provider |
|---|---|---|
| Local development | LLaMA 3.2 (2GB) | Ollama |
| Production (Render) | LLaMA3 8B | Groq API (free) |

Both models are fully **open-source**. Groq provides free cloud inference for the deployed version with no rate limit issues for demo usage.

---

## Re-Ranking Algorithm

Each retrieved result is scored using three weighted factors:

| Factor | Weight | Logic |
|---|---|---|
| Keyword relevance | 40% | Query term hits in title (2x) and abstract |
| Recency | 30% | Publications within 1–3 years score highest |
| Credibility | 30% | PubMed trust weight + citation count bonus |

Clinical trials are additionally boosted by recruiting status — `RECRUITING` trials rank highest.

---

## Deployment

### Backend — Render

Environment variables required:
```
MONGO_URI=mongodb+srv://nikhilkumarawasthi11_db_user:curalink%401@cluster0.qeq13zn.mongodb.net/curlink?retryWrites=true&w=majority
USE_OLLAMA=false
HF_TOKEN=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
PORT=5000
```

### Frontend — Vercel

Update the API URL in `src/App.js` to your Render backend URL before deploying.

---

## Example Queries

- `Latest treatment for Parkinson's disease`
- `Clinical trials for diabetes in India`
- `Deep brain stimulation outcomes 2024`
- `Recent studies on heart disease prevention`
- `What are the symptoms of lung cancer?`

---

## Disclaimer

Curalink is an AI research assistant for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.
