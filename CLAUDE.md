# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Partículas Elementales** is an RSS reader with AI-powered summaries and cloud sync. It uses an "Editorial Noir" design theme with dark backgrounds and terracotta accents, featuring Playfair Display typography.

**Live:** https://particulas-elementales.pages.dev

## Development Commands

```bash
# Backend (Express API)
cd backend
npm install
npm start          # Production: node server.js
npm run dev        # Development: nodemon server.js (auto-reload)

# Frontend (static files)
cd www
npx http-server -p 8080
```

**Environment variables for backend (.env):**
```
PORT=3000
ALLOWED_ORIGINS=http://localhost:8080
OPENAI_API_KEY=sk-...
```

## Architecture

### Three-Part System

1. **Frontend (www/)** - Vanilla JS static site hosted on Cloudflare Pages
   - `app.js` - Main application: RSS fetching, post management, cloud sync, blog CRUD
   - `reader.js` - `ArticleReader` class: full-screen reading modal, AI summaries, text highlighting
   - `auth.js` - Supabase authentication with Google OAuth
   - `twitter-import.js` - Twitter bookmarks import, folder management, classification
   - `classify-tweets.js` - One-time script to auto-classify tweets into folders

2. **Backend (backend/)** - Express API hosted on Render.com
   - `server.js` - Single file with all endpoints, uses Mozilla Readability for article extraction

3. **Chrome Extension (extension/)** - Browser extension for quick saving
   - `popup.js` / `popup.html` - Extension UI
   - `content.js` - Page content script for RSS discovery

### Data Flow

```
Frontend (Cloudflare) ──> Backend (Render) ──> OpenAI (summaries)
       │
       └──> Supabase (auth + cloud storage)
```

### Key Patterns

- **Offline-first**: All data cached in localStorage, cloud sync happens when online
- **Cloud sync resilience**: If Supabase sync fails, local data is preserved (no data loss)
- **Skip-load flags**: After local saves, `skipNextCloudLoad` prevents race conditions with cloud

### API Endpoints (backend)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/feed?url=` | Proxy RSS feed (CORS bypass) |
| `GET /api/article?url=` | Extract article content via Readability |
| `GET /api/discover-feed?url=` | Auto-discover RSS feed for a website |
| `GET /api/summary?url=&interests=` | Generate AI summary with OpenAI |

### Supabase Tables

- `user_blogs` - User's subscribed RSS feeds
- `post_statuses` - Post state (inbox/pending/favorite/cleared)
- `summaries` - Cached AI summaries per user
- `highlights` - Text highlights per article
- `manual_articles` - Manually added articles and Twitter bookmarks
  - Twitter-specific columns: `source`, `author_name`, `author_handle`, `profile_image`, `media`, `engagement_data`, `is_thread`, `folder`
- `user_settings` - User preferences (interests, `twitter_folders`)

## Post Status Workflow

Posts flow through four states:
- **inbox** → New posts from RSS feeds
- **pending** → Marked "read later"
- **favorite** → Starred posts
- **cleared** → Read or dismissed (archived)

**Twitter bookmarks** are separate from the main workflow:
- Stored with `source: 'twitter'` in `manual_articles`
- Displayed in dedicated Twitter tab (not mixed with RSS)
- Organized into folders (28 pre-configured + custom)
- Open directly in Twitter (no reader mode)

## Styling Guidelines

This project uses the **frontend-design skill** (`.claude/skills/frontend-design.md`). When making UI changes:
- Maintain the Editorial Noir aesthetic (dark theme, terracotta accents)
- Use Playfair Display for display text
- Avoid generic fonts like Inter, Arial, Roboto
- CSS variables are defined in `www/css/styles.css`
