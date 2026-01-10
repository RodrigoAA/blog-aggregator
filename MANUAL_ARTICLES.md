# Manual Article Saving

This feature allows you to save individual articles you find on the web, beyond just subscribing to RSS feeds.

## Use Cases

- **One-off interesting articles** - Save a great article from a blog you don't want to subscribe to
- **Non-RSS sources** - Save articles from sites that don't offer RSS feeds
- **Recommended reads** - Quickly save articles shared by friends or colleagues
- **Newsletters** - Save individual newsletter articles without subscribing
- **Research collection** - Build a reading list from various sources

## How to Use

### Adding an Article

1. **Find an article** you want to save on the web
2. **Copy the article URL** (the full web address)
3. **Open settings** in Partículas elementales (gear icon)
4. **Scroll to "Add Individual Article"** section
5. **Paste the URL** into the input field
6. **Click "Add Article"**

The app will:
- Extract the article metadata (title, description, author, date)
- Add it to your reading list
- Mark it with a ✨ "Manual" badge
- Sync to cloud if you're logged in

### Managing Manual Articles

**Viewing**: Manual articles appear in your main feed, mixed with RSS posts and sorted by date.

**Visual distinction**: Look for the yellow ✨ "Manual" badge next to the blog name.

**Deleting**: Click the **✕ (delete)** button that appears only on manual articles. This is different from marking as "not relevant" - deleting completely removes the article from your list.

**Status management**: Manual articles work with the same filters:
- **Inbox** - Unread articles
- **Saved** - Bookmarked for later
- **Read** - Articles you've read
- **Skipped** - Not interested

## How It Works

### Backend Extraction

When you add an article URL, the backend:

1. **Fetches the webpage** HTML
2. **Uses Mozilla Readability** to extract:
   - Article title
   - Author (byline)
   - Publication date
   - Description/excerpt
   - Site name
3. **Returns clean metadata** to the frontend

### Local Storage

Manual articles are stored in:
- **localStorage**: `blogAggregator_manualArticles`
- **Structure**: Array of article objects with same format as RSS posts

```javascript
{
  title: "Article Title",
  link: "https://example.com/article",
  date: Date object,
  description: "Article excerpt...",
  blogName: "Site Name",
  blogSlug: "manual",
  isManual: true
}
```

### Cloud Sync (Logged-in Users)

Manual articles sync via Supabase:

**Table**: `manual_articles`

**Schema**:
```sql
CREATE TABLE manual_articles (
  user_id UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP,
  site_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, url)
);
```

**Sync behavior**:
- **Add**: Immediately syncs to cloud
- **Delete**: Removes from cloud
- **Login**: Loads all manual articles from cloud

### Integration with Feed

Manual articles are **merged with RSS posts**:

1. RSS posts loaded from feeds (or cache)
2. Manual articles loaded from localStorage/cloud
3. Combined and sorted by date
4. Displayed with visual badge

## Benefits

1. **Flexibility**: Not limited to RSS-enabled sites
2. **Curation**: Build your own reading list from any source
3. **Organization**: Same workflow as RSS posts (inbox/saved/read)
4. **Sync**: Available across all your devices
5. **Persistence**: Saved permanently until you delete

## Limitations

- Requires backend to extract metadata
- Some sites block automated access (will show error)
- Paywalled content may not extract properly
- Article must be publicly accessible

## Tips

- **Browser extension** - Consider creating a bookmarklet to add articles with one click
- **Share sheet** - On mobile, copy URL and paste in app
- **Batch adding** - Add multiple articles at once before reading
- **Organize with filters** - Use "Saved" for articles you want to read soon

## Troubleshooting

**"Failed to add article"**
- Site may block automated access
- URL might be invalid
- Try the article's permalink instead of homepage

**Article title/description incorrect**
- Some sites use non-standard HTML
- Readability extraction may fail on complex layouts
- You can still read it - metadata is just for the list view

**Article not syncing**
- Check internet connection
- Verify you're logged in (Google icon in header)
- Try manual refresh (🔄 button)

**Duplicate article**
- App prevents adding the same URL twice
- Delete existing one first if you want to re-add

---

**Last Updated:** January 10, 2026
