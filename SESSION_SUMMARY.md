# Partículas Elementales - Project Summary

**Built:** January 6-9, 2026
**Live Site:** https://particulaselementales.pages.dev
**Backend API:** https://particulas-backend.onrender.com
**GitHub:** https://github.com/RodrigoAA/blog-aggregator

A Kindle-inspired RSS reader with AI-powered summaries, text highlighting, and cloud sync.

---

## Features

### Reading Experience
- Full-screen article reader with Mozilla Readability extraction
- AI summaries (TL;DR + key points) via OpenAI GPT-4o-mini
- Personalized recommendations based on user interests
- Text highlighting with click-to-remove
- Kindle aesthetic - paper-white design, serif typography

### Smart Organization
- Inbox / Read / Skipped categories
- RSS auto-discovery - enter any blog URL
- Blog management via UI

### Cloud Sync (Google Sign-In)
- Blogs, read status, highlights sync across devices
- User interests for personalized recommendations

### Performance
- Parallel fetching - article and summary load together
- Summary caching - 30-day localStorage cache
- Article caching - 24-hour cache

---

## Tech Stack

### Frontend (Cloudflare Pages)
- Vanilla JavaScript (ES6+ classes, async/await)
- Supabase (auth + database)
- localStorage (caching)
- Google Fonts (Crimson Pro, IBM Plex Serif)

### Backend (Render)
- Node.js + Express
- Mozilla Readability (article extraction)
- OpenAI API (GPT-4o-mini for summaries)
- Axios, JSDOM, CORS

---

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

---

## Project Structure

```
├── backend/
│   ├── server.js      # Express API (~500 lines)
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

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/feed?url=` | Proxy RSS feed |
| `GET /api/article?url=` | Extract article content |
| `GET /api/discover-feed?url=` | Find RSS feed for website |
| `GET /api/summary?url=&interests=` | Generate AI summary |

---

## Quick Reference

### URLs
- **Frontend:** https://particulaselementales.pages.dev
- **Backend:** https://particulas-backend.onrender.com
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Render Dashboard:** https://dashboard.render.com
- **Supabase Dashboard:** https://supabase.com/dashboard

### Local Development
```bash
# Start backend
cd backend
npm install
npm start  # http://localhost:3000

# Start frontend
cd www
npx http-server -p 8080  # http://localhost:8080
```

### Deploy
```bash
git add .
git commit -m "Your changes"
git push origin main
# Cloudflare + Render auto-deploy
```

### Environment Variables (Render)
```
PORT=3000
ALLOWED_ORIGINS=https://particulaselementales.pages.dev
OPENAI_API_KEY=sk-...
```

---

## Key Skills Learned

- **Frontend:** HTML5, CSS3, Vanilla JS, localStorage, Selection API
- **Backend:** Node.js, Express, REST APIs, CORS
- **APIs:** OpenAI integration, Supabase auth
- **DevOps:** Git, Cloudflare Pages, Render.com
- **Architecture:** Full-stack separation, caching strategies

---

Built with Claude Code
