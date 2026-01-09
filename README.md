# Partículas Elementales - Kindle-Inspired eReader

A minimalist RSS feed aggregator with a Kindle-inspired reading experience. Read full articles without leaving the app, with text highlighting, offline caching, and intelligent post management.

![Partículas Elementales](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 📖 Kindle-Inspired Reading Experience
- **Full-Screen Article Reader** - Read complete articles without external navigation
- **Clean Article Extraction** - Mozilla Readability removes ads and clutter
- **Paper-White Design** - High contrast black ink on white paper aesthetic
- **Serif Typography** - Crimson Pro and IBM Plex Serif for comfortable reading
- **Reading Progress Bar** - Visual indicator as you scroll through articles

### 🎨 Text Highlighting
- **Yellow Highlighting** - Mark important passages Kindle-style
- **Floating Button Interface** - Select text and click to highlight
- **Click to Remove** - Tap highlighted text to delete
- **Persistent Storage** - Highlights saved per article in localStorage

### 📋 Intelligent Post Management
- **Inbox/Read/Not Relevant** - Organize posts into three categories
- **Filter with Counters** - See how many posts in each status
- **Auto-Mark as Read** - Opening an article marks it as read automatically
- **Quick Actions** - Mark as read or not relevant with one click

### 🔧 Blog Management
- **Add Any RSS Feed** - Dynamic blog management via UI
- **Edit & Delete** - Remove blogs you no longer follow
- **Persistent Storage** - Blog list saved in localStorage
- **5 Default Blogs** - Pre-configured with quality content sources

### ⚡ Performance & Offline
- **Article Caching** - 24-hour cache for offline reading (50 article limit)
- **Lazy Image Loading** - Images load on-demand for faster performance
- **Skeleton Loading States** - Clean loading UI while fetching content
- **Backend API** - No third-party CORS proxy dependency

## 🚀 Live Demo

**Frontend**: https://particulaselementales.pages.dev (Cloudflare Pages)
**Backend API**: https://particulas-backend.onrender.com (Render)
**GitHub**: https://github.com/RodrigoAA/blog-aggregator

## 🏗️ Architecture

### Frontend (Cloudflare Pages)
- **HTML5** - Semantic structure
- **CSS3** - Kindle-inspired design system
- **Vanilla JavaScript** - No frameworks, ~15KB total
- **localStorage** - Client-side persistence

### Backend (Node.js + Express)
- **RSS Proxy** - Eliminates CORS issues
- **Article Extraction** - Mozilla Readability implementation
- **Error Handling** - Graceful fallbacks for paywalls and blocked sites

## 📦 Tech Stack

```
Frontend:
├── HTML5
├── CSS3 (Custom Properties)
├── JavaScript ES6+
└── Google Fonts (Crimson Pro, IBM Plex Serif)

Backend:
├── Node.js
├── Express.js
├── Axios (HTTP client)
├── @mozilla/readability (Article extraction)
├── jsdom (HTML parsing)
└── dotenv (Environment config)
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ (for backend)
- Any modern browser
- Python 3 or Node.js http-server (for frontend)

### Setup Instructions

#### 1. Clone Repository
```bash
git clone https://github.com/RodrigoAA/particulas-elementales.git
cd particulas-elementales
```

#### 2. Start Backend Server
```bash
cd backend
npm install
npm start
```

Backend will run on `http://localhost:3000`

#### 3. Start Frontend Server

**Option A: Python**
```bash
cd www
python -m http.server 8080
```

**Option B: Node.js**
```bash
cd www
npx http-server -p 8080
```

**Option C: VS Code Live Server**
- Right-click `www/index.html`
- Select "Open with Live Server"

Frontend will run on `http://localhost:8080`

#### 4. Open in Browser
Navigate to `http://localhost:8080`

## 🌐 Deployment

### Frontend (Cloudflare Pages)

1. **Create Project**
   - Go to Cloudflare Dashboard → Workers & Pages
   - Click "Create" → "Pages" tab
   - Choose "Upload assets" or "Connect to Git"

2. **If Using Direct Upload**
   - Upload the `www` folder directly
   - Deploy instantly

3. **If Using Git Integration**
   - Connect your GitHub repo
   - Set output directory to `www`
   - Cloudflare auto-deploys on push

### Backend (Multiple Options)

#### Option 1: Render.com (Recommended)
1. Create new Web Service
2. Connect GitHub repo
3. Configure:
   ```
   Build Command: cd backend && npm install
   Start Command: cd backend && npm start
   ```
4. Add environment variables:
   ```
   PORT=3000
   NODE_ENV=production
   ALLOWED_ORIGINS=https://particulaselementales.pages.dev
   ```

#### Option 2: Railway.app
1. Create new project from GitHub
2. Set root directory: `backend`
3. Railway auto-detects Node.js

#### Option 3: Heroku
```bash
cd backend
heroku create your-app-name
git subtree push --prefix backend heroku main
```

### Update Frontend API URL
After deploying backend, update `www/js/app.js`:
```javascript
window.API_BASE_URL = 'https://particulas-backend.onrender.com';
```

## 📚 Usage Guide

### Reading Articles
1. **Browse Posts** - See all posts from your blogs in the Inbox
2. **Click Title** - Opens full article in Kindle-style reader
3. **Highlight Text** - Select text and click "✨ Highlight" button
4. **Remove Highlights** - Click on highlighted text
5. **Close Reader** - Press ESC or click × button

### Managing Posts
1. **Inbox** - New, unread posts
2. **Read** - Posts you've already read
3. **Not Relevant** - Posts you want to hide
4. **Quick Actions** - Mark as read or not relevant with buttons

### Managing Blogs
1. Click **"⚙ Manage Blogs"** button (bottom-right)
2. **Add Blog**: Enter name and RSS feed URL
3. **Delete Blog**: Click delete button next to blog
4. Changes save automatically

## 🎨 Design Philosophy

### Kindle-Inspired Aesthetics
- **Paper-White** (#f4f1ea) - Easy on the eyes
- **Ink-Black** (#1a1a1a) - High contrast text
- **Serif Fonts** - Comfortable for long reading
- **Minimalist UI** - Distraction-free experience
- **No Rounded Corners** - Classic book aesthetic

### Typography Scale
```
Headers: IBM Plex Serif (sans-serif style)
Body: Crimson Pro (serif)
Line Height: 1.8 (generous spacing)
Reading Width: 680px (optimal line length)
```

## 📁 Project Structure

```
.
├── backend/
│   ├── server.js           # Express API server
│   ├── package.json        # Backend dependencies
│   ├── .env               # Environment config
│   └── .gitignore         # Ignore node_modules
│
├── www/
│   ├── index.html         # Main HTML
│   ├── css/
│   │   └── styles.css     # Kindle-inspired styles
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   └── reader.js      # Article reader class
│   └── server-simple.js   # Local dev server
│
├── README.md              # This file
├── SESSION_SUMMARY.md     # Development log
└── .gitignore            # Git ignore rules
```

## 🔑 Key Files

### Backend
- **`backend/server.js`** - Express server with two endpoints:
  - `GET /api/feed?url=<rss-url>` - Proxy RSS feeds
  - `GET /api/article?url=<article-url>` - Extract article content

### Frontend
- **`www/js/reader.js`** - ArticleReader class:
  - Modal management
  - Article extraction display
  - Text highlighting system
  - localStorage caching

- **`www/js/app.js`** - Main app logic:
  - RSS feed fetching and parsing
  - Post status management (Inbox/Read/Not Relevant)
  - Blog CRUD operations
  - Filter and UI controls

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Articles Won't Load
1. Verify backend is running on port 3000
2. Check browser console for CORS errors
3. Update `API_BASE_URL` in `app.js`

### Images Not Showing
- Some sites block hotlinking
- Images load progressively (scroll to trigger)
- Check browser console for 403 errors

## 🚧 Known Limitations

1. **Paywall Content** - Can't extract paywalled articles
2. **Some Sites Block Scraping** - 403 errors on certain domains
3. **JavaScript-Heavy Sites** - May not extract correctly
4. **Highlight Persistence** - Only works per-article, not cross-device

## 🗺️ Roadmap

- [ ] Export highlights to Markdown
- [ ] Search within articles
- [ ] Dark mode toggle
- [ ] Font size controls
- [ ] Android app with Capacitor
- [ ] Sync across devices

## 📝 Changelog

### Version 2.0.0 (Jan 8, 2026)
- ✨ Complete Kindle-inspired redesign
- 📖 Full-screen article reader with Mozilla Readability
- 🎨 Text highlighting functionality
- 📋 Inbox/Read/Not Relevant post management
- ⚡ Article caching for offline reading
- 🔧 Blog management modal
- 🚀 Backend API (eliminates CORS proxy dependency)

### Version 1.0.0 (Jan 6-7, 2026)
- Initial release with dark theme
- Dynamic blog management
- Read/unread tracking
- 5 default blogs

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

**Rodrigo Aviles**
- GitHub: [@RodrigoAA](https://github.com/RodrigoAA)

## 🙏 Acknowledgments

- [Mozilla Readability](https://github.com/mozilla/readability) - Article extraction
- [Google Fonts](https://fonts.google.com/) - Typography
- Inspired by Kindle's clean reading experience

---

Built with ❤️ using vanilla JavaScript and Node.js
