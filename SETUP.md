# Setup Guide - Partículas Elementales

Complete setup instructions for deploying the blog aggregator application.

## Prerequisites

- GitHub account
- Cloudflare account (for frontend hosting)
- Render.com account (for backend hosting)
- Supabase account (for database and auth)
- OpenAI API key (for AI summaries)

---

## 1. Supabase Setup

### Create Project

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### Create Database Tables

Open the SQL Editor in Supabase and run the following scripts:

#### Table 1: user_blogs

```sql
CREATE TABLE user_blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blogs"
  ON user_blogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blogs"
  ON user_blogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blogs"
  ON user_blogs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blogs"
  ON user_blogs FOR DELETE
  USING (auth.uid() = user_id);
```

#### Table 2: post_statuses

```sql
CREATE TABLE post_statuses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_url)
);

ALTER TABLE post_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post statuses"
  ON post_statuses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post statuses"
  ON post_statuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post statuses"
  ON post_statuses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own post statuses"
  ON post_statuses FOR DELETE
  USING (auth.uid() = user_id);
```

#### Table 3: summaries

```sql
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

CREATE POLICY "Users can view own summaries"
  ON summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON summaries FOR DELETE
  USING (auth.uid() = user_id);
```

#### Table 4: highlights

```sql
CREATE TABLE highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own highlights"
  ON highlights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own highlights"
  ON highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON highlights FOR DELETE
  USING (auth.uid() = user_id);
```

#### Table 5: user_settings

```sql
CREATE TABLE user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  interests TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);
```

#### Table 6: manual_articles (NEW)

```sql
-- Crear la tabla manual_articles
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

-- Habilitar Row Level Security (RLS)
ALTER TABLE manual_articles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own manual articles"
  ON manual_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual articles"
  ON manual_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual articles"
  ON manual_articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual articles"
  ON manual_articles FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para mejorar performance
CREATE INDEX idx_manual_articles_user_created
  ON manual_articles(user_id, created_at DESC);
```

### Configure Authentication

1. Go to Authentication → Providers
2. Enable **Google** provider
3. Add your Google OAuth credentials
4. Add authorized redirect URLs:
   - `https://your-domain.pages.dev/auth/callback`
   - `http://localhost:8080/auth/callback` (for local dev)

---

## 2. Backend Setup (Render.com)

### Create Web Service

1. Connect your GitHub repository
2. Select the `backend` directory
3. Configure:
   - **Name**: `particulas-backend` (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Environment Variables

Set these in Render dashboard:

```
PORT=3000
ALLOWED_ORIGINS=https://your-frontend-domain.pages.dev
OPENAI_API_KEY=sk-your-openai-api-key
```

### Deploy

- Push to GitHub triggers auto-deploy
- Note your backend URL: `https://particulas-backend.onrender.com`

---

## 3. Frontend Setup (Cloudflare Pages)

### Update Configuration

Edit `www/js/auth.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

Edit `www/js/app.js`:

```javascript
window.API_BASE_URL = 'https://your-backend.onrender.com';
```

### Deploy to Cloudflare Pages

1. Go to Cloudflare Pages dashboard
2. Connect your GitHub repository
3. Configure:
   - **Project name**: `particulaselementales` (or your choice)
   - **Build directory**: `www`
   - **Build command**: (leave empty - static site)
   - **Build output directory**: `/`

### Custom Domain (Optional)

1. Go to Custom Domains in Cloudflare Pages
2. Add your domain
3. Update DNS records as instructed
4. Update ALLOWED_ORIGINS in backend

---

## 4. Local Development

### Backend

```bash
cd backend
npm install

# Create .env file
echo "PORT=3000" > .env
echo "ALLOWED_ORIGINS=http://localhost:8080" >> .env
echo "OPENAI_API_KEY=sk-your-key" >> .env

npm start
```

Backend runs at `http://localhost:3000`

### Frontend

```bash
cd www

# Update API_BASE_URL in js/app.js to:
# window.API_BASE_URL = 'http://localhost:3000';

# Serve static files
npx http-server -p 8080
```

Frontend runs at `http://localhost:8080`

---

## 5. Verify Setup

### Test Checklist

- [ ] Frontend loads without errors
- [ ] Can sign in with Google
- [ ] Can add RSS blog
- [ ] Posts appear in feed
- [ ] Can add manual article
- [ ] Can read article (opens reader)
- [ ] AI summary generates
- [ ] Can highlight text
- [ ] Can mark posts as saved/read/skipped
- [ ] Data syncs across devices
- [ ] Manual refresh works

### Console Checks

Open browser DevTools console and verify:

```javascript
// Should see these logs:
"Loaded blogs from cloud: X"
"Loaded post statuses from cloud: X"
"Loaded manual articles from cloud: X"
"Total posts (RSS + Manual): X (Y + Z)"
```

### Database Checks

In Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- highlights
-- manual_articles
-- post_statuses
-- summaries
-- user_blogs
-- user_settings
```

---

## 6. Troubleshooting

### "Failed to fetch" errors

- Check CORS settings in backend
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check backend is deployed and running

### Authentication not working

- Verify Google OAuth credentials in Supabase
- Check redirect URLs match your domain
- Ensure Supabase URL and keys are correct

### Posts not syncing

- Check RLS policies are created
- Verify user is authenticated (check user icon in header)
- Open DevTools → Network tab to see API calls

### Manual articles not appearing

- Verify `manual_articles` table exists
- Check RLS policies for manual_articles
- Look for errors in console related to Supabase

### AI summaries failing

- Verify OpenAI API key is valid
- Check backend logs in Render dashboard
- Ensure you have credits in OpenAI account

---

## 7. Monitoring

### Backend Logs

- Go to Render dashboard
- Click on your service
- View Logs tab for errors

### Supabase Logs

- Go to Supabase dashboard
- Database → Logs
- API → Logs

### Frontend Errors

- Use browser DevTools Console
- Check Network tab for failed requests

---

## 8. Maintenance

### Update Dependencies

Backend:
```bash
cd backend
npm update
npm audit fix
```

Frontend uses CDN for Supabase, no updates needed.

### Backup Data

Supabase automatic backups (paid plans) or:

```sql
-- Export user data
COPY (SELECT * FROM user_blogs) TO '/tmp/user_blogs.csv' CSV HEADER;
COPY (SELECT * FROM manual_articles) TO '/tmp/manual_articles.csv' CSV HEADER;
```

---

## Summary

**Infrastructure**:
- ✅ Supabase: Database + Auth (6 tables)
- ✅ Render: Node.js backend (article extraction + AI)
- ✅ Cloudflare Pages: Static frontend hosting

**Features Enabled**:
- ✅ RSS feed aggregation
- ✅ Manual article saving
- ✅ AI-powered summaries
- ✅ Cloud sync across devices
- ✅ Posts caching for performance
- ✅ Text highlighting
- ✅ Status management (inbox/saved/read/skipped)

**Cost**: $0/month on free tiers

**Next Steps**:
1. Create all 6 Supabase tables
2. Deploy backend to Render
3. Deploy frontend to Cloudflare Pages
4. Configure Google OAuth
5. Test end-to-end

---

**Last Updated**: January 10, 2026
