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
   - `tinder-mode.js` - `TinderMode` class: mobile swipe interface for inbox triage
   - `utils.js` - Shared utilities: `escapeHtml()`, summary caching, `fetchSummary()`
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
- Organized into custom folders (user-created)
- Open directly in Twitter (no reader mode)

**Highlights** are text passages saved while reading:
- Stored in `highlights` table (keyed by `article_url`)
- Displayed in dedicated Highlights tab (after Favorites, before Cleared)
- Each highlight links back to its source article
- Click to open article, delete individual or clear all

## Tinder Mode (Mobile)

Swipe-based interface for triaging Inbox posts on mobile devices (<768px). Implemented in `www/js/tinder-mode.js`.

### Activation
- FAB (Floating Action Button) appears in bottom-right corner
- Only visible on mobile (<768px) + Inbox filter + posts available
- Controlled by `updateTinderTriggerVisibility()` in `app.js`

### Gestures
- **Swipe left** → Discard post (marked as `cleared`)
- **Swipe right** → Save for later (marked as `pending`)
- **Tap on card** → Open article in reader (hides Tinder Mode, shows reader modal)
- **Tap X/clock buttons** → Alternative to swipe gestures

### PENDING BUG (2025-01-16)
**Issue:** When tapping a card to open the article in reader, pressing X to close the reader returns to the main dashboard instead of Tinder Mode.

**Current implementation:** `openArticle()` in `tinder-mode.js` hides the container and adds event listeners on the reader's close button, overlay, and ESC key to restore Tinder Mode. The listeners are not triggering correctly.

**Attempted solutions:**
1. MutationObserver watching for `active` class removal on `#article-modal` - didn't work
2. Direct event listeners on `.close-btn`, `.article-modal-overlay`, and ESC key - didn't work

**Next steps to try:**
- Debug why the event listeners aren't firing (check if elements exist, timing issues)
- Consider modifying `reader.js` to emit a custom event on close
- Or add a "return to Tinder Mode" button in the reader when opened from Tinder Mode

### Card Content
Each card displays:
- Blog source name
- Article title
- **Reading time estimate** (calculated from word count)
- **AI TL;DR summary** (fetched on-demand if not cached)
- **Flame indicator** (1-3 flames based on recommendation score)
- Publication date

### Loading State
- Full-card loading state with centered **orbiting atom animation**
- Atom animation: nucleus with three orbiting electrons
- Displayed while fetching AI summary from backend

### Recommendation Flames
Visual indicator based on AI `recommendation_score`:
- 🔥🔥🔥 = `high` (highly relevant to user interests)
- 🔥🔥 = `medium` (somewhat relevant)
- 🔥 = `low` (low relevance)
- (grayed out) = no recommendation data

### Technical Details
- Uses Pointer Events API for cross-platform gesture handling
- Swipe threshold: 100px to confirm action
- Cards stack with current card on top, next card preview behind
- Summaries cached in `localStorage` under `summaryCache`

### Files
| File | Purpose |
|------|---------|
| `www/js/tinder-mode.js` | `TinderMode` class (~500 lines) |
| `www/css/styles.css` | Styles (search for "TINDER MODE") |
| `www/index.html` | FAB trigger button |
| `www/js/app.js` | `updateTinderTriggerVisibility()` |

### Discarded Features (2025-01-16)
The following features were attempted and removed to simplify the UX:

**Swipe Up to Expand Card (removed)**
- Attempted to add swipe up gesture to expand the card in-place showing the full article
- Issues encountered:
  - `touch-action: pan-y` blocked vertical swipe detection (fixed by changing to `touch-action: none`)
  - Orange overlay ("LEER") stayed visible blocking expanded content
  - Complex state management for expanded/collapsed states
- Decision: Simplified to tap-to-open in reader modal instead
- Reverted to commit `abe6243` and added simple tap detection

## Styling Guidelines

This project uses the **frontend-design skill** (`.claude/skills/frontend-design.md`). When making UI changes:
- Maintain the Editorial Noir aesthetic (dark theme, terracotta accents)
- Use Playfair Display for display text
- Avoid generic fonts like Inter, Arial, Roboto
- CSS variables are defined in `www/css/styles.css`

## Experimental Branches

### feature/swipe-first-v2 (PAUSED - 2025-01-16)

**Objetivo:** Promover el Tinder Mode a ser la interfaz principal de la app, no un overlay secundario.

**Estado:** En pausa. La integracion con el flujo de autenticacion OAuth no funciona correctamente - despues del login, la app muestra el layout clasico en lugar de la interfaz swipe-first.

**Archivos creados/modificados:**
- `www/index.html` - Nueva estructura con navegacion por decks (Inbox, Saved, Favorites, Twitter, Highlights)
- `www/js/swipe-controller.js` - Nuevo controlador que maneja vista swipe vs lista
- `www/css/styles.css` - Estilos para deck-nav, swipe-cards, overlays (~475 lineas agregadas)
- `www/js/app.js` - Agregado dispatch de evento `postsUpdated` e inicializacion de swipe-controller

**Concepto de diseno:**
- 5 "decks" en navegacion superior: Inbox, Saved, Favorites, Twitter, Highlights
- Inbox y Saved usan vista swipe (cards apiladas, gestos de arrastre)
- Favorites, Twitter, Highlights usan vista lista (layout clasico)
- Reutiliza la estetica existente de Tinder Mode (densidad, animaciones, flames)

**Bug pendiente:**
El flujo OAuth recarga la pagina completamente. Hay un problema de sincronizacion entre:
1. `initAuth()` - detecta sesion existente
2. `initSwipeController()` - crea el controlador
3. `init()` - carga posts desde cloud
4. Evento `postsUpdated` - deberia refrescar el swipe-controller

La vista swipe-first aparece brevemente y luego cambia al layout clasico, o nunca aparece despues del redirect de OAuth.

**Para reanudar:**
1. `git checkout feature/swipe-first-v2`
2. Debuggear el flujo de inicializacion post-OAuth
3. Verificar que el CSS `.swipe-mode` / `.list-mode` se aplica correctamente
4. Posible solucion: usar eventos custom para coordinar auth + data + UI
