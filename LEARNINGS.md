# What I Learned Building This App

**Project:** Partículas elementales (January 2026)
**Background:** Product Manager with no prior coding experience

---

## Skills Acquired

### Frontend Development
- **HTML5** - Semantic structure, modals, forms
- **CSS3** - Custom properties, Kindle-inspired design system, responsive design
- **Vanilla JavaScript** - ES6+ classes, async/await, DOM manipulation
- **localStorage** - Caching strategies, data persistence
- **Selection API** - Text highlighting with ranges

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
- Caching strategies (localStorage with expiry)
- Parallel async operations

### JavaScript Patterns
- ES6 classes for encapsulation
- async/await for API calls
- Event delegation for dynamic content
- Template literals for HTML generation

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
| Old version deploying | Wrong publish directory | Configure netlify.toml | Check deployment settings |
| Merge conflicts | Remote had changes | git pull, resolve, push | Always pull before push |

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
- **Lines of Code:** ~3,000+
- **Files:** 11 in repository
- **Technologies:** 15+
- **Problems Debugged:** 10+
- **Monthly Cost:** $0 (free tiers)

---

*From zero coding to a deployed full-stack app. Not just "Hello World" - a real product people can use.*
