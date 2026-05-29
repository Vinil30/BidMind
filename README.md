# BidMind

BidMind is a Flask-based AI proposal and pitch management platform for three user roles: businesses, entrepreneurs, and investors. It helps businesses collect and evaluate proposals, entrepreneurs submit investor-ready pitches, and investors discover, review, save, reject, and summarize relevant startup opportunities.

## Core Features

- Role-based signup, login, and dashboards for Business, Entrepreneur, and Investor users.
- Business proposal intake with proposal requests, proposal-specific share links, submissions, AI-style match scores, preferences, analytics, and dashboard pipeline views.
- Entrepreneur pitch management with create, update, delete, analytics, investor match visibility, and vector search indexing.
- Investor dashboard with opportunity feed, preference tuning, portfolio view, saved summaries, decision history, analytics, and pitch detail review.
- Proposal sharing through copyable links plus Facebook, X/Twitter, LinkedIn, and email sharing.
- Deployment-ready configuration for Render using Gunicorn.
- The repo currently contains vector DB folder, but in real-time production, we will be using API.

## AI and Matching Features

- FAISS vector store for pitch retrieval.
- HuggingFace sentence embeddings through LangChain for semantic pitch search.
- Investor feed generation with LangGraph workflows.
- Groq/OpenAI-compatible chat completions for feed summaries.
- Investor decision workflow powered by LangGraph:
  - `matched`: stores investor-entrepreneur match records.
  - `maybe`: creates saved summaries for later review.
  - `rejected`: stores rejection records and blocks repeat feed entries.
- Business proposal matching based on saved preferences:
  - Preferred categories.
  - Preferred technologies.
  - Match threshold.
  - Budget and project scope preferences.

## MongoDB Usage

The app uses MongoDB Atlas through `MONGO_URI`. Main database: `SaaS`.

Collections used:

- `users`: account and role data.
- `pitches`: entrepreneur pitch records.
- `investors`: investor-specific records.
- `proposals`: business proposal request records.
- `submissions`: submitted proposals from shared business links.
- `preferences`: business, investor, and entrepreneur preference settings.
- `matches`: investor opportunity review analytics.
- `portfolio`: investor accepted/saved portfolio records.
- `analytics`: dashboard metric records.
- `proposal_links`: active business proposal share slugs.
- `business_analytics`: cached business dashboard analytics.
- `summaries`: saved investor summaries for maybe decisions.
- `investor_feed`: generated investor feed matches.
- `investor_ent_macthes`: investor-to-entrepreneur yes decisions.
- `investor_maybe`: investor maybe decisions.
- `investor_rejections`: investor rejected pitches.
- `investor_feed_blocker`: prevents decided pitches from returning to the feed.

## Tech Stack

- Backend: Flask, Gunicorn.
- Database: MongoDB Atlas, PyMongo.
- AI orchestration: LangGraph.
- Vector search: FAISS, LangChain, HuggingFace embeddings.
- LLM API: Groq/OpenAI-compatible client.
- Frontend: HTML templates, CSS, vanilla JavaScript.

## Environment Variables

Create `.env` locally from `.env.example`.

Required:

```env
SECRET_KEY=replace-with-a-random-secret
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/
GROQ_API_KEY=replace-with-groq-key
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
SHARE_BASE_URL=http://localhost:5000
```

For Render, set `SHARE_BASE_URL` to your deployed URL, for example:

```env
SHARE_BASE_URL=https://your-service.onrender.com
```

## Local Setup

```bash
pip install -r requirements.txt
python app.py
```

Local app URL:

```text
http://localhost:5000
```

## Render Deployment

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
gunicorn app:app
```

The repo includes:

- `render.yaml`
- `Procfile`
- `runtime.txt`
- `DEPLOY_RENDER.md`

Before deploying, add the required environment variables in Render and allow Render access in MongoDB Atlas Network Access.

## Important Notes

- Keep `.env` private. It is ignored by Git.
- `faiss_index/` stores local vector search data.
- Business share links are generated from `SHARE_BASE_URL` or the current request host.
- Render sets `PORT` automatically; `app.py` reads it for production.
