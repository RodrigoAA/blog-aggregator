# Partículas Elementales - Blog Aggregator

A sleek, dark-themed RSS feed aggregator for reading your favorite blogs in one place. Dynamically add or remove any RSS feed, with read/unread tracking and persistent storage.

## Features
- 🎨 **Dark Theme** - Claude-inspired design with refined typography
- ➕ **Dynamic Blog Management** - Add/remove any RSS feed via the UI
- 📖 **Read/Unread Tracking** - Mark posts as read with localStorage persistence
- 🎨 **Smart Color System** - Automatic color assignment for blog badges (15-color palette)
- 📅 **Localized Dates** - Spanish locale with GMT+1 timezone support
- 📱 **Responsive Design** - Mobile and desktop friendly
- ⚡ **Fast & Lightweight** - Pure vanilla JavaScript, no frameworks
- 🔖 **Custom Favicon** - Atomic particle design matching the brand

## Live Site
https://particulaselementales.netlify.app/

## How to Use

### Managing Blogs
1. Click the "⚙️ Manage Blogs" button
2. See your current blog list
3. Add new blogs by entering:
   - Blog name
   - RSS feed URL
4. Delete blogs with the delete button
5. Changes persist across sessions

### Reading Posts
1. Browse posts from all your blogs in one unified feed
2. Click post titles to read the full article
3. Mark posts as read/unread with the button
4. Read status is saved automatically

## Default Blogs
The app comes pre-configured with these blogs:
- Rodobo
- Shreyas Doshi
- Simon Sarris
- Henrik Karlsson
- Bonillaware

You can remove any of these or add your own!

## Tech Stack
- **HTML5** - Semantic structure
- **CSS3** - Dark theme with custom properties
- **JavaScript (ES6+)** - Vanilla, no frameworks
- **localStorage** - Data persistence
- **SVG** - Favicon embedded as data URI
- **RSS/Atom** - Feed parsing
- **CORS Proxy** - Feed access (corsproxy.io)

## Local Development
1. Clone the repository
   ```bash
   git clone https://github.com/RodrigoAA/blog-aggregator.git
   cd blog-aggregator
   ```
2. Open `index.html` in your browser
3. That's it! No build process needed.

## Deployment
This site automatically deploys to Netlify when changes are pushed to the `main` branch.

## Color Palette
- **Accent**: #cc9b7a (Clay/Tan)
- **Background**: #1a1a1a (Dark charcoal)
- **Cards**: #242424 (Dark gray)
- **Text**: #e8e8e8 (Light gray)

## Project Evolution
- **Day 1 (Jan 6, 2026)**: Initial build with 5 hardcoded blogs, read/unread tracking, deployment
- **Day 2 (Jan 7, 2026)**: Added dynamic blog management, dark theme redesign, favicon, timezone fixes

## License
MIT

---

Built with ❤️ using vanilla JavaScript
