# Caching Strategy

This document describes the comprehensive caching system implemented in Partículas elementales to improve performance and user experience.

## Overview

The application implements a **multi-layer caching strategy** across different data types:

1. **Posts Cache** (RSS feed data)
2. **Article Content Cache** (extracted article HTML)
3. **AI Summaries Cache** (cloud + local)
4. **User Data Cache** (blogs, post statuses, highlights)

---

## 1. Posts Cache (RSS Feeds)

**Purpose:** Cache parsed RSS posts to avoid re-fetching feeds on every page load.

### Implementation

**Location:** `www/js/app.js`

**Key Functions:**
- `getPostsCache()` - Retrieves cached posts if valid
- `savePostsCache(posts, blogs)` - Saves posts to cache
- `clearPostsCache()` - Manually clears cache

**Storage:** `localStorage['blogAggregator_postsCache']`

### Cache Structure

```javascript
{
  posts: [
    {
      title: "Post title",
      link: "https://...",
      date: Date,
      description: "Preview text...",
      blogName: "Blog Name",
      blogSlug: "blog-slug"
    },
    // ...
  ],
  blogs: [
    { name: "Blog", slug: "blog", url: "https://..." },
    // ...
  ],
  timestamp: 1704902400000  // Unix timestamp
}
```

### Cache Expiry

**Duration:** 1 hour (configurable via `POSTS_CACHE_EXPIRY`)

```javascript
const POSTS_CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
```

### Cache Invalidation

The cache is automatically invalidated when:

1. **Time expires** - Cache older than 1 hour
2. **Blogs change** - Blog URLs added/removed/modified
3. **Manual refresh** - User clicks refresh button (🔄)
4. **Blog management** - User adds/deletes blogs

**Validation Logic:**

```javascript
// Check timestamp
if (now - cache.timestamp > POSTS_CACHE_EXPIRY) {
    return null;  // Expired
}

// Check if blogs changed
const currentBlogUrls = currentBlogs.map(b => b.url).sort().join(',');
const cachedBlogUrls = cache.blogs.map(b => b.url).sort().join(',');

if (currentBlogUrls !== cachedBlogUrls) {
    return null;  // Blogs changed
}
```

### User Controls

- **Automatic:** Cache used transparently on page load
- **Manual Refresh:** Header button (🔄) forces fresh fetch
- **Visual Feedback:** Loading states show "Loading from cache..." vs "Fetching feeds..."

---

## 2. Article Content Cache

**Purpose:** Cache extracted article content for offline reading.

### Implementation

**Location:** `www/js/reader.js`

**Storage:** `localStorage['articleCache']`

**Expiry:** 24 hours

**Limit:** Last 50 articles (FIFO)

### Cache Structure

```javascript
{
  "https://article-url": {
    article: {
      title: "Article Title",
      byline: "Author Name",
      content: "<div>...</div>",
      length: 2500,  // word count
      siteName: "Site Name"
    },
    timestamp: 1704902400000
  }
}
```

### Methods

- `getCachedArticle(url)` - Get cached article if valid
- `cacheArticle(url, article)` - Save article to cache
- `loadCache()` - Load cache on initialization
- `saveCache()` - Persist cache to localStorage

---

## 3. AI Summaries Cache

**Purpose:** Avoid regenerating expensive AI summaries.

### Two-Layer System

#### Layer 1: Local Cache

**Storage:** `localStorage['summaryCache']`
**Expiry:** 30 days
**Limit:** Last 100 summaries

#### Layer 2: Cloud Cache

**Storage:** Supabase `summaries` table
**Expiry:** Never (permanent)
**Sync:** Across all user devices

### Cache Structure (Local)

```javascript
{
  "https://article-url": {
    data: {
      tldr: "2-3 sentence summary",
      keyPoints: ["Point 1", "Point 2", "Point 3"],
      recommendation: {
        score: "high",  // high|medium|low
        reason: "Explanation..."
      }
    },
    timestamp: 1704902400000
  }
}
```

### Cache Strategy

1. Check **local cache** first (instant)
2. If miss, check **cloud cache** (logged-in users)
3. If miss, generate via **OpenAI API**
4. Save to both caches for future use

---

## 4. User Data Cache

### Blogs List

**Storage:**
- `localStorage['blogAggregator_blogs']` (local)
- Supabase `user_blogs` table (cloud)

**Sync:** Bidirectional on login

### Post Statuses

**Storage:**
- `localStorage['blogAggregator_postStatuses']` (local)
- Supabase `post_statuses` table (cloud)

**Structure:**
```javascript
{
  "https://post-url": "inbox",  // inbox|saved|read|not_relevant
  "https://another-post": "saved"
}
```

**Sync:** Write to cloud on every status change

### Article Highlights

**Storage:**
- `localStorage['articleHighlights']` (local)
- Supabase `highlights` table (cloud)

**Structure:**
```javascript
{
  "https://article-url": [
    {
      text: "highlighted text",
      position: 123  // character offset
    }
  ]
}
```

---

## Performance Benefits

| Metric | Before Cache | After Cache | Improvement |
|--------|-------------|-------------|-------------|
| Initial page load | ~3-5 seconds | ~200ms | **15-25x faster** |
| Network requests | 5-10 feeds | 0 requests | **100% reduction** |
| Data transfer | 100-500 KB | 0 KB | **100% reduction** |
| Offline capability | None | Partial | View cached posts |

---

## Cache Management

### Automatic Management

All caches are managed automatically:
- Expired entries removed on read
- Size limits enforced (FIFO eviction)
- Invalid caches cleared automatically

### Manual Management

Users can trigger cache operations:
- **Refresh button** - Bypass posts cache
- **Add/delete blog** - Auto-clears posts cache
- **Browser clear data** - Removes all caches

### Developer Tools

Console logging shows cache operations:

```javascript
console.log('Loading 42 posts from cache');
console.log('Posts cache expired');
console.log('Blogs configuration changed, invalidating cache');
console.log('Cached 42 posts');
```

---

## Best Practices Learned

1. **Cache aggressively, invalidate smartly**
   - Cache everything that's expensive to fetch
   - Invalidate only when necessary

2. **Include configuration in cache**
   - Store blog list alongside posts
   - Detect changes to invalidate cache

3. **Provide manual override**
   - Always give users a refresh button
   - Don't force stale data

4. **Progressive enhancement**
   - App works without cache
   - Cache makes it faster, not required

5. **Visual feedback**
   - Show "Loading from cache..." vs "Fetching..."
   - Users appreciate knowing what's happening

---

## Future Improvements

Potential enhancements:

- [ ] Service Worker for true offline mode
- [ ] Background sync for stale cache refresh
- [ ] Configurable cache expiry in settings
- [ ] Cache size indicators in UI
- [ ] Export/import cache functionality
- [ ] Differential updates (only new posts)

---

**Last Updated:** January 10, 2026
