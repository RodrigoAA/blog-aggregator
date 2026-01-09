# What I Learned Building This App

**Project:** Partículas elementales (January 2026)
**Background:** Product Manager with no prior coding experience

---

## Skills Acquired

### Frontend Development
- **HTML5** - Semantic structure, modals, forms, SVG icons
- **CSS3** - Custom properties, shadows, animations, line-clamp truncation
- **Vanilla JavaScript** - ES6+ classes, async/await, DOM manipulation
- **localStorage** - Caching strategies, data persistence
- **Selection API** - Text highlighting with ranges
- **UI/UX Polish** - Touch targets, micro-interactions, visual hierarchy

### Backend Development
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - REST API creation, middleware, routing
- **Article Extraction** - Mozilla Readability + JSDOM
- **CORS** - Cross-origin configuration
- **Environment Variables** - dotenv, secrets management

### APIs & Integrations
- **OpenAI API** - GPT-4o-mini for summaries, JSON response format
- **Supabase** - Authentication (Google OAuth), PostgreSQL database
- **RSS Parsing** - XML parsing, feed discovery

### DevOps & Deployment
- **Git** - Version control, merge conflicts, branching
- **GitHub** - Remote repositories, collaboration
- **Cloudflare Pages** - Static site hosting, auto-deploy
- **Render.com** - Node.js backend hosting

---

## Key Concepts Mastered

### Architecture Patterns
- Frontend/backend separation
- API-based communication
- Multi-layer caching (cloud + localStorage)
- Parallel async operations (Promise.all)
- Unified loading states

### JavaScript Patterns
- ES6 classes for encapsulation
- async/await for API calls
- Event delegation for dynamic content
- Template literals for HTML generation
- Conditional rendering based on state

### CSS Patterns
- CSS custom properties (variables)
- Modern shadows instead of borders
- CSS line-clamp for text truncation
- Transform animations (scale on hover)
- Transition timing for polish

### Security Practices
- Environment variables for secrets
- .gitignore for sensitive files
- CORS configuration
- Input validation

---

## Problems Solved & Lessons Learned

| Problem | Cause | Solution | Lesson |
|---------|-------|----------|--------|
| CORS errors fetching RSS | Browser security | Built own backend proxy | Own backend > third-party proxies |
| Variable already declared | Same name used twice | Renamed to unique name | Check scope carefully |
| Images not loading | Observer created before DOM | Split init from lazy load | Order matters with DOM |
| Two loading spinners | Article showed before summary | Wait for both with Promise.all | Unified loading = better UX |
| Redundant Mark Read button | Already marked when opened | Removed button entirely | Simplify when possible |
| Vague timestamps | "Yesterday" not specific | Show actual date (Jan 8) | Clarity over cleverness |

---

## From PM to Developer

**What this experience taught me:**

1. **Technical constraints are real** - Now I understand why "simple" features take time
2. **Debugging is learning** - Each bug teaches something new
3. **Start simple, iterate** - v1.0 was basic, v2.0 was production-ready
4. **Documentation matters** - README, comments, clear naming
5. **Deployment is straightforward** - Modern platforms (Cloudflare, Render) make it easy

**Skills that transfer to PM work:**
- Understanding technical trade-offs
- Estimating development effort more accurately
- Writing better technical specs
- Prototyping ideas independently

---

## Resources for Continued Learning

### Recommended Next Steps
- [JavaScript.info](https://javascript.info/) - Deep JS knowledge
- [Learn Git Branching](https://learngitbranching.js.org/) - Interactive git
- [MDN Web Docs](https://developer.mozilla.org/) - Web API reference
- [CSS-Tricks](https://css-tricks.com/) - CSS techniques

### Tools to Explore
- VS Code extensions
- Browser DevTools (F12)
- Postman (API testing)
- GitHub Copilot

---

## Quick Stats

- **Duration:** 4 days (Jan 6-9, 2026)
- **Commits:** 25+
- **Files:** 11 in repository
- **Supabase Tables:** 4 (user_blogs, post_statuses, highlights, summaries)
- **Technologies:** 15+
- **Monthly Cost:** $0 (free tiers)

---

*From zero coding to a deployed full-stack app with cloud sync, AI summaries, and polished UI.*
