# Partículas Elementales

A Kindle-inspired RSS reader with AI-powered summaries and cloud sync.

**Live:** https://particulaselementales.pages.dev

## Features

### Reading Experience
- **Full-screen article reader** with Mozilla Readability extraction
- **AI summaries** (TL;DR + key points) powered by OpenAI GPT-4o-mini
- **Personalized recommendations** based on your interests
- **Text highlighting** with click-to-remove
- **Kindle aesthetic** - paper-white design, serif typography

### Smart Organization
- **Inbox / Read / Skipped** - organize posts into categories
- **RSS auto-discovery** - enter any blog URL, we find the feed
- **Blog management** - add/remove feeds via UI

### Cloud Sync (with Google Sign-In)
- **Blogs sync** across devices
- **Read status sync** across devices
- **Highlights sync** across devices
- **User interests** for personalized recommendations

### Performance
- **Parallel fetching** - article and summary load together
- **Summary caching** - 30-day localStorage cache
- **Article caching** - 24-hour cache for offline reading

## Tech Stack

```
Frontend (Cloudflare Pages):
├── Vanilla JavaScript
├── Supabase (auth + database)
└── localStorage (caching)

Backend (Render):
├── Node.js + Express
├── Mozilla Readability
├── OpenAI API (GPT-4o-mini)
└── RSS feed proxy
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │────▶│     Render      │────▶│     OpenAI      │
│   Pages (www)   │     │   (backend)     │     │   (summaries)   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │
│  (auth + sync)  │
└─────────────────┘
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/feed?url=` | Proxy RSS feed |
| `GET /api/article?url=` | Extract article content |
| `GET /api/discover-feed?url=` | Find RSS feed for website |
| `GET /api/summary?url=&interests=` | Generate AI summary |

## Local Development

```bash
# Backend
cd backend
npm install
npm start  # http://localhost:3000

# Frontend
cd www
npx http-server -p 8080  # http://localhost:8080
```

## Environment Variables

### Backend (Render)
```
PORT=3000
ALLOWED_ORIGINS=https://particulaselementales.pages.dev
OPENAI_API_KEY=sk-...
```

## Deployment

- **Frontend**: Push to GitHub → Cloudflare Pages auto-deploys
- **Backend**: Push to GitHub → Render auto-deploys

## Project Structure

```
├── backend/
│   ├── server.js      # Express API
│   └── package.json
│
├── www/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js     # Main logic + cloud sync
│       ├── reader.js  # Article reader + summaries
│       └── auth.js    # Supabase authentication
│
└── README.md
```

## Credits

- [Mozilla Readability](https://github.com/mozilla/readability) - Article extraction
- [Supabase](https://supabase.com) - Auth and database
- [OpenAI](https://openai.com) - AI summaries

---

Built with Claude Code
