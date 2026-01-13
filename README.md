# Partículas Elementales

A modern RSS reader with AI-powered summaries and cloud sync. Features an **Editorial Noir** design with dark theme and terracotta accents.

**Live:** https://particulas-elementales.pages.dev

## Features

- **Editorial Noir design** - Dark theme with Playfair Display typography
- **Full-screen article reader** with Mozilla Readability extraction
- **AI summaries** (TL;DR + key points) powered by OpenAI GPT-4o-mini
- **Four-tab workflow:** Inbox → Pending → Favorites / Cleared
- **Manual article saving** - add articles from any website
- **Text highlighting** with click-to-remove
- **Cloud sync** (Google Sign-In) across devices
- **Persistent cache** with new posts detection banner

## Post Categories

| Status | Purpose |
|--------|---------|
| **Inbox** | New posts from RSS feeds |
| **Pending** | Marked to read later |
| **Favorites** | Posts you loved |
| **Cleared** | Read + skipped (archived) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS, Supabase Auth |
| Backend | Node.js, Express, Mozilla Readability |
| AI | OpenAI GPT-4o-mini |
| Database | Supabase (PostgreSQL) |
| Hosting | Cloudflare Pages + Render.com |

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

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/feed?url=` | Proxy RSS feed |
| `GET /api/article?url=` | Extract article content |
| `GET /api/discover-feed?url=` | Find RSS feed for website |
| `GET /api/summary?url=&interests=` | Generate AI summary |

---

## Setup

### Prerequisites

- GitHub, Cloudflare, Render.com, Supabase, OpenAI accounts

### 1. Supabase Setup

Create a project at [supabase.com](https://supabase.com), then run this SQL in the SQL Editor:

```sql
-- Table 1: user_blogs
CREATE TABLE user_blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE user_blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own blogs" ON user_blogs
  FOR ALL USING (auth.uid() = user_id);

-- Table 2: post_statuses
CREATE TABLE post_statuses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('inbox', 'pending', 'favorite', 'cleared')),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_url)
);
ALTER TABLE post_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own statuses" ON post_statuses
  FOR ALL USING (auth.uid() = user_id);

-- Table 3: summaries
CREATE TABLE summaries (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url TEXT NOT NULL,
  tldr TEXT NOT NULL,
  key_points TEXT[] NOT NULL,
  recommendation_score TEXT,
  recommendation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, article_url)
);
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own summaries" ON summaries
  FOR ALL USING (auth.uid() = user_id);

-- Table 4: highlights
CREATE TABLE highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own highlights" ON highlights
  FOR ALL USING (auth.uid() = user_id);

-- Table 5: user_settings
CREATE TABLE user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  interests TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Table 6: manual_articles
CREATE TABLE manual_articles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP,
  site_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, url)
);
ALTER TABLE manual_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own articles" ON manual_articles
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_manual_articles_user_created
  ON manual_articles(user_id, created_at DESC);
```

Enable **Google OAuth** in Authentication → Providers.

### 2. Backend (Render.com)

1. Create Web Service from GitHub repo
2. Set root directory: `backend`
3. Build: `npm install` / Start: `npm start`
4. Environment variables:
   ```
   PORT=3000
   ALLOWED_ORIGINS=https://your-domain.pages.dev
   OPENAI_API_KEY=sk-...
   ```

### 3. Frontend (Cloudflare Pages)

1. Update `www/js/auth.js` with Supabase URL and anon key
2. Update `www/js/app.js` with backend URL
3. Deploy from GitHub, build directory: `www`

---

## Local Development

```bash
# Backend
cd backend
npm install
echo "PORT=3000\nALLOWED_ORIGINS=http://localhost:8080\nOPENAI_API_KEY=sk-..." > .env
npm start  # http://localhost:3000

# Frontend
cd www
npx http-server -p 8080  # http://localhost:8080
```

---

## Caching Strategy

| Cache | Duration | Invalidation |
|-------|----------|--------------|
| RSS Posts | Permanent | When blogs change |
| Articles | 24 hours | Automatic |
| AI Summaries | 30 days local + cloud | Never |

The refresh button checks for new posts in background. If found, a banner appears: "X new posts available".

---

## Credits

- [Mozilla Readability](https://github.com/mozilla/readability)
- [Supabase](https://supabase.com)
- [OpenAI](https://openai.com)

Built with Claude Code
