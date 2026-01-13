# Partículas Elementales - Project Context

## Overview
RSS reader with AI-powered summaries and cloud sync. Editorial Noir design (dark theme, terracotta accents).

**Live:** https://particulas-elementales.pages.dev

## Tech Stack
- **Frontend:** Vanilla JS, Supabase Auth (www/)
- **Backend:** Node.js, Express, Mozilla Readability (backend/)
- **AI:** OpenAI GPT-4o-mini for summaries
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Cloudflare Pages (frontend) + Render.com (backend)

## Key Files
| File | Purpose |
|------|---------|
| `www/js/app.js` | Main logic, cloud sync, post management |
| `www/js/reader.js` | Article reader, AI summaries, highlights |
| `www/js/auth.js` | Supabase authentication |
| `www/add.html` | Mobile quick save (clipboard) |
| `www/css/styles.css` | Editorial Noir styles |
| `backend/server.js` | API: RSS proxy, article extraction, AI summaries |
| `extension/` | Chrome extension for desktop |

## Project Rules

### UI/Frontend Design:
- Always use the frontend-design skill when creating or modifying UI components
- Skill reference: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- This project follows "Editorial Noir" aesthetic: dark theme, Playfair Display typography, terracotta accents

### After implementing new features:
- Update README.md with new functionality
- Add new files to the project structure section if needed
- Update API endpoints table if backend changes

### Code style:
- No emojis in code or documentation unless requested
- Keep console.log statements minimal (remove debug logs before committing)
- Spanish for user-facing text, English for code/comments

### Repository hygiene:
- Delete temporary files (tmpclaude-*, etc.) before committing
- Keep commits focused and well-described

## Database Tables (Supabase)
- `user_blogs` - RSS feed subscriptions
- `post_statuses` - inbox/pending/favorite/cleared states
- `summaries` - AI summaries cache (has DELETE policy)
- `highlights` - Text highlights
- `user_settings` - User interests for recommendations
- `manual_articles` - Manually saved articles

## Common Tasks

### Adding a new feature:
1. Implement in appropriate JS file
2. Add styles to styles.css if needed
3. Test locally
4. Update README.md
5. Commit with descriptive message

### Debugging mobile:
- Use add.html's on-page error display
- Backend may be sleeping on Render free tier (takes ~30s to wake)
