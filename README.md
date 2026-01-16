# Partículas Elementales

A modern RSS reader with AI-powered summaries and cloud sync. Features an **Editorial Noir** design with dark theme and terracotta accents.

**Live:** https://particulas-elementales.pages.dev

![Editorial Noir Design](https://img.shields.io/badge/design-Editorial%20Noir-e85d04) ![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)

## Features

- **Editorial Noir design** - Dark theme with Playfair Display typography
- **Full-screen article reader** with Mozilla Readability extraction
- **AI summaries** (TL;DR + key points) powered by OpenAI GPT-4o-mini
- **Reading Recommendations** - Personalized relevance scores based on your interests
- **Five-tab workflow:** Inbox → Pending → Favorites → Cleared + Twitter
- **Twitter/X bookmarks import** - Import bookmarks via JSON export with folder organization
- **Manual article saving** - add articles from any website
- **Text highlighting** with click-to-remove and dedicated Highlights page (header icon)
- **Cloud sync** (Google Sign-In) across devices
- **Persistent cache** with new posts detection banner
- **Mobile-friendly** - works on iOS and Android browsers
- **Tinder Mode** - Swipe-based inbox triage on mobile with AI summaries and reading time

## Post Categories

| Status | Purpose |
|--------|---------|
| **Inbox** | New posts from RSS feeds |
| **Pending** | Marked to read later |
| **Favorites** | Posts you loved |
| **Cleared** | Read + skipped (archived) |
| **Twitter** | Imported Twitter/X bookmarks (separate section with folders) |

**Highlights** are accessed via a dedicated page (pencil icon in header) - text passages saved while reading articles.

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
│   ├── add.html       # Mobile quick save page
│   ├── css/styles.css
│   └── js/
│       ├── app.js            # Main logic + cloud sync
│       ├── reader.js         # Article reader + summaries
│       ├── auth.js           # Supabase authentication
│       ├── tinder-mode.js    # Mobile swipe interface for inbox triage
│       ├── twitter-import.js # Twitter bookmarks import + folders
│       ├── utils.js          # Shared utilities (escapeHtml, fetchSummary)
│       └── classify-tweets.js # One-time tweet classification script
│
├── extension/         # Chrome extension
│   ├── manifest.json
│   ├── popup.html/js
│   ├── content.js
│   └── icons/
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

- **Node.js** >= 18.0.0
- **Accounts:** GitHub, Cloudflare, Render.com, Supabase, OpenAI

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
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, article_url)
);
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own summaries" ON summaries
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summaries" ON summaries
  FOR DELETE USING (auth.uid() = user_id);

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

-- Twitter bookmarks support (run if upgrading from older version)
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS author_handle TEXT;
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS media JSONB;
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS engagement_data JSONB;
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS is_thread BOOLEAN DEFAULT FALSE;
ALTER TABLE manual_articles ADD COLUMN IF NOT EXISTS folder TEXT;

-- Update user_settings for Twitter folders
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twitter_folders JSONB;
```

**Enable Google OAuth:**
1. Go to Authentication → Providers → Google
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

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

### Backend
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=3000
ALLOWED_ORIGINS=http://localhost:8080
OPENAI_API_KEY=sk-your-key-here
```

```bash
npm start  # http://localhost:3000
```

### Frontend
```bash
cd www
npx http-server -p 8080  # http://localhost:8080
```

Update `www/js/app.js` line ~10:
```javascript
window.API_BASE_URL = 'http://localhost:3000';
```

---

## Caching & Sync Strategy

| Data | Local Cache | Cloud Sync |
|------|-------------|------------|
| RSS Posts | Permanent (until blogs change) | No |
| Manual Articles | localStorage | Supabase |
| Twitter Bookmarks | localStorage | Supabase |
| Twitter Folders | localStorage | Supabase (user_settings) |
| Post Statuses | localStorage | Supabase |
| Blogs | localStorage | Supabase |
| AI Summaries + Recommendations | 30 days (cleared on interests change) | Supabase |
| Highlights | localStorage | Supabase |

### Offline-First Behavior

- All data is cached locally in localStorage
- Cloud sync happens on login and when data changes
- **If cloud sync fails, local data is preserved** (no data loss)
- Manual articles wait for cloud save before confirming

### Refresh Behavior

- The refresh button checks for new posts in background
- If new posts found: banner appears with "X new posts available"
- If no new posts: shows "No new posts" message (auto-hides after 2s)
- New posts are merged with cache without losing current view

---

## Twitter Bookmarks Import

Import your Twitter/X bookmarks and organize them with folders.

### How to Export Bookmarks

1. Install [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) browser extension
2. Visit your [Twitter/X bookmarks page](https://twitter.com/i/bookmarks)
3. Use the extension to export as JSON
4. Upload the JSON file in the app (click the upload icon in header)

### Folder Organization

- Create custom folders via "Manage Folders"
- Assign folders to tweets individually
- Folders sync to cloud for cross-device access

### Features

- Profile images and author handles
- Media display (images/videos)
- Thread indicator badge
- Engagement stats (likes, retweets)
- Direct links to Twitter (no reader mode)
- Delete all functionality

---

## Chrome Extension

A browser extension to quickly save articles and subscribe to RSS feeds.

### Features
- **Add Article** - Save current page to your reading list
- **Subscribe to RSS** - Auto-detects RSS/Atom feeds on blogs

### Installation

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder

Icons are pre-generated in `extension/icons/` with a terracotta background for visibility in both light and dark browser themes. To regenerate, open `extension/generate-icons.html` in Chrome and click "Download All".

### Supported Platforms
Auto-detects RSS feeds on: Substack, Medium, WordPress, Ghost, and any site with standard RSS/Atom links.

---

## Mobile Quick Save

Save articles from your mobile browser using the clipboard-based capture page.

### Setup (one time)

1. Open `https://particulas-elementales.pages.dev/add.html` on your phone
2. **iOS Safari:** Tap Share → "Add to Home Screen"
3. **Android Chrome:** Menu (⋮) → "Add to Home Screen"

### Usage

1. Find an interesting article
2. Copy the URL (Share → Copy Link)
3. Tap the home screen shortcut
4. The page auto-reads clipboard and shows the URL
5. Tap "Save to Inbox"

**Flow:** Copy → Tap → Tap = **3 taps**

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Backend returns 404 | Render free tier sleeping | Wait 30-60s, service auto-wakes on first request |
| Google login fails on mobile | OAuth redirect issue | Clear browser cache, try again |
| AI Summary not generating | Missing OpenAI API key | Check backend `.env` has valid `OPENAI_API_KEY` |
| Articles show hostname as title | Backend was sleeping during save | Edit title manually in the quick save page |
| Cloud sync not working | RLS policy missing | Verify all Supabase policies are created |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Credits

- [Mozilla Readability](https://github.com/mozilla/readability)
- [Supabase](https://supabase.com)
- [OpenAI](https://openai.com)

Built with [Claude Code](https://claude.ai/code)
