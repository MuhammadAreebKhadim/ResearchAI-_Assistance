# AI Research Assistant

An AI-powered web application for academic researchers — built with Next.js, FastAPI, and OpenAI GPT-4o.

## Features

- **Research Discovery** — Natural conversation to discover relevant papers across Semantic Scholar, ArXiv, and OpenAlex
- **Paper Explainer** — Upload any PDF and get summaries, plain-language explanations, deep section breakdowns, or Q&A
- **Collaboration Finder** — Analyze a professor's research profile and check alignment with your own work

## Project Structure

```
ai-research-assistant/
├── frontend/          # Next.js 14 app
└── backend/           # Python FastAPI app
```

## Quick Start

### 1. Set up the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Copy and edit environment variables
copy .env.example .env
# Edit .env with your OpenAI API key

# Start the server
uvicorn main:app --reload --port 8000
```

### 2. Set up the frontend

```bash
cd frontend
npm install

# Copy env file
copy .env.example .env.local

# Start the dev server
npm run dev
```

The app runs at **http://localhost:3000**  
The API runs at **http://localhost:8000**

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o` |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Optional — increases rate limits |
| `OPENALEX_EMAIL` | No | Your email for OpenAlex polite pool |
| `DATABASE_URL` | No | Defaults to SQLite for local dev |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

## Research APIs Used

All free, no paid key required:

| API | Coverage |
|---|---|
| [Semantic Scholar](https://api.semanticscholar.org/) | CS, AI, medicine, biology |
| [ArXiv](https://arxiv.org/help/api/) | Physics, math, CS preprints |
| [OpenAlex](https://openalex.org/) | 250M+ works across all fields |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Python FastAPI, async/await
- **AI**: OpenAI GPT-4o (streaming)
- **PDF**: pdfplumber
- **Database**: SQLite (local) / PostgreSQL (production)
