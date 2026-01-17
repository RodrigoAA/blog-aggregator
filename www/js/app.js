/**
 * Partículas elementales - Main Application
 * Blog aggregator with Kindle-inspired eReader
 */

// ============================================================
// CONFIGURATION
// ============================================================

// Backend API URL (set this before deploying)
window.API_BASE_URL = 'https://particulas-backend.onrender.com';

// New posts indicator state
let pendingNewPosts = [];
let lastKnownPostLinks = new Set();

// Default blogs configuration
const DEFAULT_BLOGS = [
    {
        name: 'Rodobo',
        slug: 'rodobo',
        url: 'https://www.rodobo.es/feed'
    },
    {
        name: 'Shreyas Doshi',
        slug: 'shreyas',
        url: 'https://shreyasdoshi.substack.com/feed'
    },
    {
        name: 'Simon Sarris',
        slug: 'simon',
        url: 'https://simonsarris.substack.com/feed'
    },
    {
        name: 'Henrik Karlsson',
        slug: 'henrik',
        url: 'https://www.henrikkarlsson.xyz/feed'
    },
    {
        name: 'Bonillaware',
        slug: 'bonilla',
        url: 'https://bonillaware.com/feed'
    }
];

// ============================================================
// BLOG MANAGEMENT
// ============================================================

// In-memory cache for blogs (loaded from Supabase or localStorage)
let blogsCache = null;

// Get blogs - returns cached data (call loadBlogsFromCloud first)
function getBlogs() {
    // Don't return any blogs if not authenticated
    if (!isAuthenticated()) {
        return [];
    }
    if (blogsCache !== null) {
        return blogsCache;
    }
    // Fallback to localStorage if cache not loaded
    const stored = localStorage.getItem('blogAggregator_blogs');
    if (stored) {
        return JSON.parse(stored);
    }
    return [];
}

// Save blogs - saves to localStorage AND Supabase (if logged in)
function saveBlogs(blogs) {
    blogsCache = blogs;
    localStorage.setItem('blogAggregator_blogs', JSON.stringify(blogs));

    // Sync to Supabase if logged in
    if (isAuthenticated()) {
        // Set flag to skip next cloud load (we have fresh local data)
        skipNextCloudLoad = true;
        saveBlogsToCloud(blogs);
    }
}

// Flag to skip cloud load (set after local save)
let skipNextCloudLoad = false;

// Load blogs from Supabase (called on init if logged in)
async function loadBlogsFromCloud() {
    if (!isAuthenticated()) {
        blogsCache = getBlogs();
        return;
    }

    // Skip if we just saved locally (avoid race condition)
    if (skipNextCloudLoad) {
        skipNextCloudLoad = false;
        console.log('Skipping cloud load (using local cache)');
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { data, error } = await supabase
            .from('user_blogs')
            .select('name, slug, url')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error loading blogs from cloud:', error);
            // Keep local data on error instead of clearing
            blogsCache = JSON.parse(localStorage.getItem('blogAggregator_blogs') || '[]');
            return;
        }

        console.log('Loaded blogs from cloud:', data?.length || 0);
        blogsCache = data || [];

        // Also update localStorage as cache
        localStorage.setItem('blogAggregator_blogs', JSON.stringify(blogsCache));
    } catch (error) {
        console.error('Failed to load blogs from cloud:', error);
        // Keep local data on error instead of clearing
        blogsCache = JSON.parse(localStorage.getItem('blogAggregator_blogs') || '[]');
    }
}

// Save blogs to Supabase
async function saveBlogsToCloud(blogs) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        // Delete all existing blogs for user
        await supabase
            .from('user_blogs')
            .delete()
            .eq('user_id', user.id);

        // Insert new blogs
        if (blogs.length > 0) {
            const { error } = await supabase
                .from('user_blogs')
                .insert(blogs.map(blog => ({
                    user_id: user.id,
                    name: blog.name,
                    slug: blog.slug,
                    url: blog.url
                })));

            if (error) {
                console.error('Error saving blogs to cloud:', error);
            } else {
                console.log('Blogs saved to cloud:', blogs.length);
            }
        }
    } catch (error) {
        console.error('Failed to save blogs to cloud:', error);
    }
}

function generateSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ============================================================
// RSS FEED FETCHING
// ============================================================

async function fetchFeed(blog) {
    console.log(`Fetching ${blog.name} from ${blog.url}`);

    try {
        // Use our backend API instead of CORS proxy
        const response = await fetch(
            `${window.API_BASE_URL}/api/feed?url=${encodeURIComponent(blog.url)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log(`Successfully fetched ${blog.name}, length: ${text.length}`);
        return { blog, xml: text, success: true };
    } catch (error) {
        console.error(`Error fetching ${blog.name}:`, error);
        updateStatus(`Failed to load ${blog.name}: ${error.message}`);
        return { blog, error, success: false };
    }
}

// ============================================================
// POSTS CACHE MANAGEMENT
// ============================================================

function getPostsCache() {
    try {
        const cached = localStorage.getItem('blogAggregator_postsCache');
        if (!cached) return null;

        const cache = JSON.parse(cached);

        // Check if blogs have changed (compare URLs) - this is the only invalidation
        const currentBlogs = getBlogs();
        const currentBlogUrls = currentBlogs.map(b => b.url).sort().join(',');
        const cachedBlogUrls = (cache.blogs || []).map(b => b.url).sort().join(',');

        if (currentBlogUrls !== cachedBlogUrls) {
            console.log('Blogs configuration changed, invalidating cache');
            return null;
        }

        console.log(`Loading ${cache.posts.length} posts from cache`);

        // Restore Date objects
        cache.posts.forEach(post => {
            if (post.date) {
                post.date = new Date(post.date);
            }
        });

        // Store known post links for new posts detection
        cache.posts.forEach(post => lastKnownPostLinks.add(post.link));

        return cache.posts;
    } catch (error) {
        console.error('Error loading posts cache:', error);
        return null;
    }
}

function savePostsCache(posts, blogs) {
    try {
        const cache = {
            posts: posts,
            blogs: blogs,
            timestamp: Date.now()
        };
        localStorage.setItem('blogAggregator_postsCache', JSON.stringify(cache));

        // Update lastKnownPostLinks to match cached posts
        posts.forEach(post => lastKnownPostLinks.add(post.link));

        console.log(`Cached ${posts.length} posts`);
    } catch (error) {
        console.error('Error saving posts cache:', error);
    }
}

function clearPostsCache() {
    localStorage.removeItem('blogAggregator_postsCache');
    lastKnownPostLinks.clear();
    console.log('Posts cache cleared');
}

// ============================================================
// NEW POSTS INDICATOR
// ============================================================

function createNewPostsBanner() {
    // Check if banner already exists
    if (document.getElementById('new-posts-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'new-posts-banner';
    banner.className = 'new-posts-banner';
    banner.innerHTML = `
        <span class="new-posts-text"></span>
        <button class="new-posts-btn" onclick="loadNewPosts()">Load new posts</button>
        <button class="new-posts-dismiss" onclick="dismissNewPostsBanner()">×</button>
    `;
    banner.style.display = 'none';

    // Insert after filters
    const filters = document.querySelector('.filters');
    if (filters) {
        filters.parentNode.insertBefore(banner, filters.nextSibling);
    }
}

function showNewPostsBanner(count) {
    const banner = document.getElementById('new-posts-banner');
    if (!banner) return;

    const text = banner.querySelector('.new-posts-text');
    text.textContent = `${count} new post${count > 1 ? 's' : ''} available`;
    banner.style.display = 'flex';
}

function hideNewPostsBanner() {
    const banner = document.getElementById('new-posts-banner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function showNoNewPostsMessage() {
    // Reuse the banner element for the message
    const banner = document.getElementById('new-posts-banner');
    if (!banner) return;

    const text = banner.querySelector('.new-posts-text');
    const btn = banner.querySelector('.new-posts-btn');

    if (text) text.textContent = 'No new posts';
    if (btn) btn.style.display = 'none';

    banner.style.display = 'flex';

    // Auto-hide after 2 seconds
    setTimeout(() => {
        banner.style.display = 'none';
        if (btn) btn.style.display = '';
    }, 2000);
}

function clearPendingNewPosts() {
    pendingNewPosts = [];
}

function dismissNewPostsBanner() {
    hideNewPostsBanner();
    clearPendingNewPosts();
}

function loadNewPosts() {
    hideNewPostsBanner();
    // Merge new posts with existing and refresh display
    if (pendingNewPosts.length > 0) {
        // Add new posts to cache
        const cachedPosts = getPostsCache() || [];

        // Deduplicate: new posts first, then cached (excluding duplicates)
        const newPostLinks = new Set(pendingNewPosts.map(p => p.link));
        const uniqueCachedPosts = cachedPosts.filter(p => !newPostLinks.has(p.link));
        const mergedPosts = [...pendingNewPosts, ...uniqueCachedPosts];

        console.log(`Merging ${pendingNewPosts.length} new + ${uniqueCachedPosts.length} cached = ${mergedPosts.length} total`);

        // Save merged cache (this also updates lastKnownPostLinks)
        const blogs = getBlogs();
        savePostsCache(mergedPosts, blogs);

        // Get manual articles
        const manualArticles = getManualArticles();
        manualArticles.forEach(article => {
            if (article.date && typeof article.date === 'string') {
                article.date = new Date(article.date);
            }
            article.isManual = true;
        });

        // Update allPosts and display based on current filter
        allPosts = [...mergedPosts, ...manualArticles];
        if (currentFilter === 'twitter') {
            displayTwitterPosts();
        } else {
            displayPosts(allPosts);
        }

        pendingNewPosts = [];
    }
}

// Check for new posts in background (without replacing current view)
async function checkForNewPosts() {
    // Don't check for new posts if not authenticated
    if (!isAuthenticated()) return;

    const blogs = getBlogs();
    if (blogs.length === 0) return;

    console.log('Checking for new posts in background...');

    try {
        // Fetch all feeds in parallel
        const feedPromises = blogs.map(blog => fetchFeed(blog));
        const feedResults = await Promise.all(feedPromises);

        // Parse all feeds
        const freshPosts = feedResults.flatMap(result => parseFeed(result));

        // Find new posts (not in lastKnownPostLinks)
        const newPosts = freshPosts.filter(post => !lastKnownPostLinks.has(post.link));

        if (newPosts.length > 0) {
            console.log(`Found ${newPosts.length} new posts`);
            pendingNewPosts = newPosts;
            showNewPostsBanner(newPosts.length);
        } else {
            console.log('No new posts found');
            showNoNewPostsMessage();
        }
    } catch (error) {
        console.error('Error checking for new posts:', error);
    }
}

// ============================================================
// MANUAL ARTICLES MANAGEMENT
// ============================================================

// In-memory cache for manual articles
let manualArticlesCache = null;

// Flag to skip cloud load (set after local save)
let skipNextManualArticlesCloudLoad = false;

function getManualArticles() {
    if (manualArticlesCache !== null) {
        return manualArticlesCache;
    }
    const stored = localStorage.getItem('blogAggregator_manualArticles');
    return stored ? JSON.parse(stored) : [];
}

function saveManualArticles(articles) {
    manualArticlesCache = articles;
    localStorage.setItem('blogAggregator_manualArticles', JSON.stringify(articles));
}

async function addManualArticleToList(article) {
    const articles = getManualArticles();

    // Check for duplicates
    if (articles.some(a => a.link === article.link)) {
        console.log('Article already exists:', article.link);
        return false;
    }

    articles.unshift(article); // Add at beginning
    saveManualArticles(articles);

    // Sync to cloud if logged in
    if (isAuthenticated()) {
        // Set flag to skip next cloud load (we have fresh local data)
        skipNextManualArticlesCloudLoad = true;
        await saveManualArticleToCloud(article);
    }

    return true;
}

function deleteManualArticle(link) {
    const articles = getManualArticles();
    const filtered = articles.filter(a => a.link !== link);
    saveManualArticles(filtered);

    // Delete from cloud if logged in
    if (isAuthenticated()) {
        // Set flag to skip next cloud load (we have fresh local data)
        skipNextManualArticlesCloudLoad = true;
        deleteManualArticleFromCloud(link);
    }
}

// Load manual articles from Supabase
async function loadManualArticlesFromCloud() {
    if (!isAuthenticated()) {
        manualArticlesCache = getManualArticles();
        return;
    }

    // Skip if we just saved locally (avoid race condition)
    if (skipNextManualArticlesCloudLoad) {
        skipNextManualArticlesCloudLoad = false;
        console.log('Skipping manual articles cloud load (using local cache)');
        manualArticlesCache = getManualArticles();
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { data, error } = await supabase
            .from('manual_articles')
            .select('url, title, description, date, site_name, source, author_name, author_handle, profile_image, media, engagement_data, is_thread, folder')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading manual articles from cloud:', error);
            // Keep local data on error instead of clearing
            manualArticlesCache = getManualArticles();
            return;
        }

        // Get existing local data to preserve folder assignments not yet synced to cloud
        const localArticles = JSON.parse(localStorage.getItem('blogAggregator_manualArticles') || '[]');
        const localFolderMap = new Map();
        localArticles.forEach(a => {
            if (a.folder) {
                localFolderMap.set(a.link, a.folder);
            }
        });

        // Convert to post format, preserving local folder if cloud has null
        const articles = (data || []).map(item => {
            const localFolder = localFolderMap.get(item.url);
            return {
                title: item.title,
                link: item.url,
                date: new Date(item.date),
                description: item.description || '',
                blogName: item.site_name || 'Manual',
                blogSlug: item.source === 'twitter' ? 'twitter' : 'manual',
                isManual: true,
                source: item.source || 'manual',
                authorName: item.author_name || '',
                authorHandle: item.author_handle || '',
                profileImage: item.profile_image || '',
                media: item.media || [],
                engagementData: item.engagement_data || null,
                isThread: item.is_thread || false,
                // Prefer cloud folder, fall back to local folder if cloud is null
                folder: item.folder || localFolder || null
            };
        });

        console.log('Loaded manual articles from cloud:', articles.length);
        manualArticlesCache = articles;
        localStorage.setItem('blogAggregator_manualArticles', JSON.stringify(articles));
    } catch (error) {
        console.error('Failed to load manual articles from cloud:', error);
        // Keep local data on error instead of clearing
        manualArticlesCache = getManualArticles();
    }
}

// Save single manual article to Supabase
async function saveManualArticleToCloud(article) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { error } = await supabase
            .from('manual_articles')
            .upsert({
                user_id: user.id,
                url: article.link,
                title: article.title,
                description: article.description,
                date: article.date.toISOString(),
                site_name: article.blogName,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,url'
            });

        if (error) {
            console.error('Error saving manual article to cloud:', error);
        } else {
            console.log('Manual article saved to cloud');
        }
    } catch (error) {
        console.error('Failed to save manual article to cloud:', error);
    }
}

// Delete manual article from Supabase
async function deleteManualArticleFromCloud(url) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { error } = await supabase
            .from('manual_articles')
            .delete()
            .eq('user_id', user.id)
            .eq('url', url);

        if (error) {
            console.error('Error deleting manual article from cloud:', error);
        }
    } catch (error) {
        console.error('Failed to delete manual article from cloud:', error);
    }
}

// Fetch article metadata from backend
async function fetchArticleMetadata(url) {
    try {
        const response = await fetch(
            `${window.API_BASE_URL}/api/article?url=${encodeURIComponent(url)}`
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Create post object from article data
        const post = {
            title: data.title || 'Untitled',
            link: url,
            date: data.publishedTime ? new Date(data.publishedTime) : new Date(),
            description: data.excerpt || (data.textContent ? data.textContent.substring(0, 200) + '...' : ''),
            blogName: data.siteName || new URL(url).hostname,
            blogSlug: 'manual',
            isManual: true
        };

        return post;
    } catch (error) {
        console.error('Error fetching article metadata:', error);
        throw error;
    }
}

// UI function to add manual article
async function addManualArticle() {
    const urlInput = document.getElementById('article-url');
    const addBtn = document.querySelector('.add-article-btn');

    const url = urlInput.value.trim();

    // Validation
    if (!url) {
        alert('Please enter an article URL');
        return;
    }

    // Basic URL validation
    try {
        new URL(url);
    } catch (e) {
        alert('Please enter a valid URL');
        return;
    }

    // Show loading state
    addBtn.textContent = 'Extracting article...';
    addBtn.disabled = true;

    try {
        // Fetch article metadata
        const article = await fetchArticleMetadata(url);

        // Add to list
        const added = await addManualArticleToList(article);

        if (!added) {
            alert('This article is already in your reading list');
            addBtn.textContent = 'Add Article';
            addBtn.disabled = false;
            return;
        }

        // Clear input
        urlInput.value = '';

        // Reset button
        addBtn.textContent = 'Article added!';
        setTimeout(() => {
            addBtn.textContent = 'Add Article';
            addBtn.disabled = false;
        }, 2000);

        // Refresh posts display to include the new article
        init();

    } catch (error) {
        console.error('Error adding manual article:', error);
        alert(`Failed to add article: ${error.message}`);
        addBtn.textContent = 'Add Article';
        addBtn.disabled = false;
    }
}

function updateStatus(message) {
    const loading = document.getElementById('loading');
    if (loading && loading.style.display !== 'none') {
        loading.textContent = message;
    }
}

// ============================================================
// FEED PARSING
// ============================================================

function parseFeed(feedData) {
    if (!feedData.success) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(feedData.xml, 'text/xml');
    const posts = [];

    // Check if it's RSS or Atom format
    const isAtom = doc.querySelector('feed');

    if (isAtom) {
        // Parse Atom feed
        const entries = doc.querySelectorAll('entry');
        entries.forEach(entry => {
            const content = entry.querySelector('summary, content')?.textContent || '';
            posts.push({
                title: entry.querySelector('title')?.textContent || 'No title',
                link: entry.querySelector('link')?.getAttribute('href') || '#',
                date: new Date(entry.querySelector('published, updated')?.textContent || Date.now()),
                description: cleanDescription(content),
                blogName: feedData.blog.name,
                blogSlug: feedData.blog.slug
            });
        });
    } else {
        // Parse RSS feed
        const items = doc.querySelectorAll('item');
        items.forEach(item => {
            const content = item.querySelector('description, content\\:encoded')?.textContent || '';
            posts.push({
                title: item.querySelector('title')?.textContent || 'No title',
                link: item.querySelector('link')?.textContent || '#',
                date: new Date(item.querySelector('pubDate')?.textContent || Date.now()),
                description: cleanDescription(content),
                blogName: feedData.blog.name,
                blogSlug: feedData.blog.slug
            });
        });
    }

    return posts;
}

function cleanDescription(text) {
    // Remove HTML tags
    const temp = document.createElement('div');
    temp.innerHTML = text;
    let cleaned = temp.textContent || temp.innerText || '';

    // Truncate to 200 characters
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 200) + '...';
    }

    return cleaned;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
}

// ============================================================
// POST STATUS MANAGEMENT (Inbox/Read/Not Relevant)
// ============================================================

// Post status constants
const POST_STATUS = {
    INBOX: 'inbox',
    PENDING: 'pending',     // Para leer después
    FAVORITE: 'favorite',   // Posts que te encantaron
    CLEARED: 'cleared'      // Leídos + descartados
};

// Current filter
let currentFilter = POST_STATUS.INBOX;

// In-memory cache for post statuses
let postStatusesCache = null;

function getPostStatuses() {
    if (postStatusesCache !== null) {
        return postStatusesCache;
    }
    const stored = localStorage.getItem('blogAggregator_postStatuses');
    if (!stored) return {};

    const statuses = JSON.parse(stored);

    // Migrate legacy status values
    let migrated = false;
    for (const url in statuses) {
        const status = statuses[url];
        if (status === 'saved') {
            statuses[url] = 'pending';
            migrated = true;
        } else if (status === 'read' || status === 'not_relevant') {
            statuses[url] = 'cleared';
            migrated = true;
        }
    }

    // Save migrated data
    if (migrated) {
        console.log('Migrated legacy post statuses to new format');
        localStorage.setItem('blogAggregator_postStatuses', JSON.stringify(statuses));
    }

    return statuses;
}

function savePostStatuses(statuses) {
    postStatusesCache = statuses;
    localStorage.setItem('blogAggregator_postStatuses', JSON.stringify(statuses));
}

function getPostStatus(postLink) {
    const statuses = getPostStatuses();
    return statuses[postLink] || POST_STATUS.INBOX;
}

function setPostStatus(postLink, status) {
    const statuses = getPostStatuses();
    statuses[postLink] = status;
    savePostStatuses(statuses);

    // Sync to Supabase if logged in
    if (isAuthenticated()) {
        savePostStatusToCloud(postLink, status);
    }
}

function markAsCleared(postLink) {
    setPostStatus(postLink, POST_STATUS.CLEARED);
}

function markAsPending(postLink) {
    setPostStatus(postLink, POST_STATUS.PENDING);
}

function markAsFavorite(postLink) {
    setPostStatus(postLink, POST_STATUS.FAVORITE);
}

function markAsInbox(postLink) {
    setPostStatus(postLink, POST_STATUS.INBOX);
}

// Load post statuses from Supabase
async function loadPostStatusesFromCloud() {
    if (!isAuthenticated()) {
        postStatusesCache = getPostStatuses();
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { data, error } = await supabase
            .from('post_statuses')
            .select('post_url, status')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error loading post statuses from cloud:', error);
            // Keep local data on error instead of clearing
            postStatusesCache = JSON.parse(localStorage.getItem('blogAggregator_postStatuses') || '{}');
            return;
        }

        // Convert array to object and migrate legacy values
        const statuses = {};
        let needsMigration = false;
        (data || []).forEach(item => {
            let status = item.status;
            // Migrate legacy values
            if (status === 'saved') {
                status = 'pending';
                needsMigration = true;
            } else if (status === 'read' || status === 'not_relevant') {
                status = 'cleared';
                needsMigration = true;
            }
            statuses[item.post_url] = status;
        });

        console.log('Loaded post statuses from cloud:', Object.keys(statuses).length);
        if (needsMigration) {
            console.log('Note: Some statuses need migration in Supabase. Run migration SQL.');
        }
        postStatusesCache = statuses;
        localStorage.setItem('blogAggregator_postStatuses', JSON.stringify(statuses));
    } catch (error) {
        console.error('Failed to load post statuses from cloud:', error);
        // Keep local data on error instead of clearing
        postStatusesCache = JSON.parse(localStorage.getItem('blogAggregator_postStatuses') || '{}');
    }
}

// Save single post status to Supabase
async function savePostStatusToCloud(postUrl, status) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { error } = await supabase
            .from('post_statuses')
            .upsert({
                user_id: user.id,
                post_url: postUrl,
                status: status,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,post_url'
            });

        if (error) {
            console.error('Error saving post status to cloud:', error);
        }
    } catch (error) {
        console.error('Failed to save post status to cloud:', error);
    }
}

// Filter posts by status
function filterPostsByStatus(posts, status) {
    return posts.filter(post => getPostStatus(post.link) === status);
}

// Get counts for each status
function getStatusCounts(posts) {
    const counts = {
        inbox: 0,
        pending: 0,
        favorite: 0,
        cleared: 0
    };

    posts.forEach(post => {
        const status = getPostStatus(post.link);
        counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
}

// ============================================================
// POST DISPLAY
// ============================================================

function showSkeletonPosts(count = 5) {
    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = Array(count).fill().map(() => `
        <div class="post-skeleton">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        </div>
    `).join('');
}

// Store all posts globally for filtering
let allPosts = [];

function displayPosts(posts) {
    const postsContainer = document.getElementById('posts');
    const loadingIndicator = document.getElementById('loading');

    // Store all posts
    allPosts = posts;

    // Hide loading indicator
    loadingIndicator.style.display = 'none';

    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No posts found</h2>
                <p>Unable to load posts from your RSS feeds. Please check your internet connection and try again.</p>
            </div>
        `;
        return;
    }

    // Sort posts by date (newest first)
    posts.sort((a, b) => b.date - a.date);

    // Update filter counts
    updateFilterCounts(posts);

    // Filter posts based on current filter
    const filteredPosts = filterPostsByStatus(posts, currentFilter);

    // Show empty state if no posts in current filter
    if (filteredPosts.length === 0) {
        const filterNames = {
            inbox: 'Inbox',
            pending: 'Pending',
            favorite: 'Favorites',
            cleared: 'Cleared'
        };
        postsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No posts in ${filterNames[currentFilter]}</h2>
                <p>Try selecting a different filter above.</p>
            </div>
        `;
        return;
    }

    // Create HTML for each post
    postsContainer.innerHTML = filteredPosts.map(post => {
        const status = getPostStatus(post.link);
        const statusClass = status === POST_STATUS.CLEARED ? 'cleared' :
                           status === POST_STATUS.FAVORITE ? 'favorite' : '';

        return `
            <article class="post-card ${statusClass}"
                     data-url="${escapeHtml(post.link)}"
                     data-title="${escapeHtml(post.title)}"
                     data-blog="${escapeHtml(post.blogName)}"
                     data-is-manual="${post.isManual || false}">
                <div class="post-header">
                    <span class="blog-source">${escapeHtml(post.blogName)}</span>
                    ${post.isManual ? '<span class="manual-badge">Manual</span>' : ''}
                </div>
                <h2 class="post-title">${escapeHtml(post.title)}</h2>
                <div class="post-meta">
                    <span class="post-date">${formatDate(post.date)}</span>
                </div>
                <p class="post-description">${escapeHtml(post.description)}</p>
                <div class="post-actions">
                    ${status === POST_STATUS.INBOX ? `
                        <button class="action-icon-btn favorite-btn" data-url="${escapeHtml(post.link)}" title="Add to Favorites">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="action-icon-btn pending-btn" data-url="${escapeHtml(post.link)}" title="Read later">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>
                        <button class="action-icon-btn clear-btn" data-url="${escapeHtml(post.link)}" title="Clear">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </button>
                        ${post.isManual ? `
                            <button class="action-icon-btn delete-manual-btn" data-url="${escapeHtml(post.link)}" title="Delete article">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        ` : ''}
                    ` : ''}
                    ${status === POST_STATUS.PENDING ? `
                        <button class="action-icon-btn favorite-btn" data-url="${escapeHtml(post.link)}" title="Add to Favorites">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="action-icon-btn inbox-btn" data-url="${escapeHtml(post.link)}" title="Move to Inbox">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                            </svg>
                        </button>
                        ${post.isManual ? `
                            <button class="action-icon-btn delete-manual-btn" data-url="${escapeHtml(post.link)}" title="Delete article">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        ` : ''}
                    ` : ''}
                    ${status === POST_STATUS.CLEARED ? `
                        <button class="action-icon-btn favorite-btn" data-url="${escapeHtml(post.link)}" title="Add to Favorites">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="action-icon-btn inbox-btn" data-url="${escapeHtml(post.link)}" title="Move to Inbox">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                            </svg>
                        </button>
                        ${post.isManual ? `
                            <button class="action-icon-btn delete-manual-btn" data-url="${escapeHtml(post.link)}" title="Delete article">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        ` : ''}
                    ` : ''}
                    ${status === POST_STATUS.FAVORITE ? `
                        <button class="action-icon-btn clear-btn" data-url="${escapeHtml(post.link)}" title="Remove from Favorites">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="action-icon-btn inbox-btn" data-url="${escapeHtml(post.link)}" title="Move to Inbox">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                            </svg>
                        </button>
                        ${post.isManual ? `
                            <button class="action-icon-btn delete-manual-btn" data-url="${escapeHtml(post.link)}" title="Delete article">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        ` : ''}
                    ` : ''}
                </div>
            </article>
        `;
    }).join('');

    // Attach click handlers
    attachPostClickHandlers();
    attachActionButtonHandlers();

    // Update Tinder mode trigger visibility
    updateTinderTriggerVisibility();
}

// escapeHtml() moved to utils.js

// ============================================================
// FILTERS AND UI CONTROLS
// ============================================================

function setFilter(filter) {
    currentFilter = filter;

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

    // Re-display posts with new filter
    if (filter === 'twitter') {
        displayTwitterPosts();
    } else if (filter === 'highlights') {
        displayHighlights();
    } else {
        displayPosts(allPosts);
    }

    // Update Tinder mode trigger visibility
    updateTinderTriggerVisibility();
}

// Update Tinder mode FAB visibility (mobile only, Inbox with posts)
function updateTinderTriggerVisibility() {
    const trigger = document.getElementById('tinder-mode-trigger');
    if (!trigger) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isInbox = currentFilter === POST_STATUS.INBOX;
    const hasInboxPosts = filterPostsByStatus(allPosts, POST_STATUS.INBOX).length > 0;

    if (isMobile && isInbox && hasInboxPosts) {
        trigger.classList.add('visible');
    } else {
        trigger.classList.remove('visible');
    }
}

// Display Twitter bookmarks (separate from RSS posts)
function displayTwitterPosts() {
    const postsContainer = document.getElementById('posts');
    const loadingIndicator = document.getElementById('loading');

    loadingIndicator.style.display = 'none';

    // Get Twitter bookmarks from manual articles
    const twitterPosts = getManualArticles().filter(a => a.source === 'twitter');

    // Update filter counts (for Twitter badge)
    updateFilterCounts(allPosts);

    if (twitterPosts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No Twitter bookmarks</h2>
                <p>Import your Twitter/X bookmarks using the import button in the header.</p>
            </div>
        `;
        return;
    }

    // Get folders
    const folders = typeof getTwitterFolders === 'function' ? getTwitterFolders() : [];
    const currentFolder = typeof currentTwitterFolder !== 'undefined' ? currentTwitterFolder : null;

    // Filter by folder if selected
    let filteredPosts = twitterPosts;
    if (currentFolder === '') {
        // Uncategorized
        filteredPosts = twitterPosts.filter(p => !p.folder);
    } else if (currentFolder) {
        filteredPosts = twitterPosts.filter(p => p.folder === currentFolder);
    }

    // Count posts per folder
    const uncategorizedCount = twitterPosts.filter(p => !p.folder).length;

    // Add header with folders and delete all button
    const headerHtml = `
        <div class="twitter-section-header">
            <div class="twitter-folders">
                <button class="twitter-folder-btn ${currentFolder === null ? 'active' : ''}" onclick="setTwitterFolderFilter(null)">
                    All (${twitterPosts.length})
                </button>
                <button class="twitter-folder-btn ${currentFolder === '' ? 'active' : ''}" onclick="setTwitterFolderFilter('')">
                    Uncategorized (${uncategorizedCount})
                </button>
                ${folders.map(f => {
                    const count = twitterPosts.filter(p => p.folder === f.slug).length;
                    return `<button class="twitter-folder-btn ${currentFolder === f.slug ? 'active' : ''}" onclick="setTwitterFolderFilter('${f.slug}')">
                        ${escapeHtml(f.name)} (${count})
                    </button>`;
                }).join('')}
                <button class="twitter-folder-add-btn" onclick="openFolderManager()" title="Manage folders">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
            <button class="twitter-delete-all-btn" onclick="deleteAllTwitterBookmarks()">
                Delete All
            </button>
        </div>
    `;

    // Sort by date (newest first)
    twitterPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Show empty state if no posts in current folder
    if (filteredPosts.length === 0 && currentFolder !== null) {
        postsContainer.innerHTML = headerHtml + `
            <div class="empty-state">
                <h2>No tweets in this folder</h2>
                <p>Move tweets here or select a different folder.</p>
            </div>
        `;
        return;
    }

    // Create HTML for each tweet
    postsContainer.innerHTML = headerHtml + filteredPosts.map(post => {
        return `
            <article class="post-card twitter-post"
                     data-url="${escapeHtml(post.link)}"
                     data-title="${escapeHtml(post.title)}"
                     data-blog="${escapeHtml(post.blogName || 'Twitter')}"
                     data-is-manual="true">
                <div class="twitter-post-layout">
                    ${post.profileImage ? `
                        <img class="twitter-avatar" src="${escapeHtml(post.profileImage)}" alt="${escapeHtml(post.authorName)}" onerror="this.style.display='none'" />
                    ` : `
                        <div class="twitter-avatar-placeholder">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </div>
                    `}
                    <div class="twitter-post-content">
                        <div class="post-header">
                            <span class="twitter-author-name">${escapeHtml(post.authorName || 'Twitter')}</span>
                            ${post.authorHandle ? `<span class="twitter-handle">${escapeHtml(post.authorHandle)}</span>` : ''}
                            <span class="twitter-date">${formatDate(new Date(post.date))}</span>
                            ${post.isThread ? `<span class="thread-badge" title="Part of a thread - click to see full context on Twitter">Thread</span>` : ''}
                        </div>
                        <p class="twitter-text">${escapeHtml(post.description || '')}</p>
                        ${post.media && post.media.length > 0 ? `
                            <div class="twitter-media ${post.media.length > 1 ? 'twitter-media-grid' : ''}">
                                ${post.media.slice(0, 4).map(m => `
                                    ${m.type === 'video' ? `
                                        <div class="twitter-media-item twitter-video">
                                            <img src="${escapeHtml(m.thumbnail)}" alt="Video thumbnail" />
                                            <div class="twitter-video-badge">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                </svg>
                                            </div>
                                        </div>
                                    ` : `
                                        <img class="twitter-media-item" src="${escapeHtml(m.url)}" alt="Tweet image" onerror="this.style.display='none'" />
                                    `}
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="post-actions">
                            <select class="twitter-folder-select" data-url="${escapeHtml(post.link)}" onchange="setTweetFolder('${escapeHtml(post.link)}', this.value); displayTwitterPosts();">
                                <option value="" ${!post.folder ? 'selected' : ''}>No folder</option>
                                ${folders.map(f => `<option value="${f.slug}" ${post.folder === f.slug ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
                            </select>
                            <button class="action-icon-btn delete-manual-btn" data-url="${escapeHtml(post.link)}" title="Delete bookmark">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    // Attach click handlers
    attachPostClickHandlers();
    attachActionButtonHandlers();
}

function updateFilterCounts(posts) {
    const counts = getStatusCounts(posts);

    // Update count badges
    const inboxBtn = document.querySelector('[data-filter="inbox"]');
    const pendingBtn = document.querySelector('[data-filter="pending"]');
    const favoriteBtn = document.querySelector('[data-filter="favorite"]');
    const clearedBtn = document.querySelector('[data-filter="cleared"]');
    const twitterBtn = document.querySelector('[data-filter="twitter"]');

    if (inboxBtn) {
        const badge = inboxBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.inbox;
    }
    if (pendingBtn) {
        const badge = pendingBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.pending;
    }
    if (favoriteBtn) {
        const badge = favoriteBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.favorite;
    }
    if (clearedBtn) {
        const badge = clearedBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.cleared;
    }
    if (twitterBtn) {
        const badge = twitterBtn.querySelector('.count-badge');
        if (badge) {
            // Count Twitter bookmarks from manual articles
            const twitterCount = getManualArticles().filter(a => a.source === 'twitter').length;
            badge.textContent = twitterCount;
        }
    }

    // Update highlights count
    const highlightsBtn = document.querySelector('[data-filter="highlights"]');
    if (highlightsBtn) {
        const badge = highlightsBtn.querySelector('.count-badge');
        if (badge) {
            badge.textContent = getHighlightsCount();
        }
    }
}

// ============================================================
// ARTICLE READER INTEGRATION
// ============================================================

function attachPostClickHandlers() {
    const postCards = document.querySelectorAll('.post-card');

    postCards.forEach(card => {
        // Click anywhere on card to open article
        const openArticle = (e) => {
            // Don't trigger if clicking a button or action area
            if (e.target.tagName === 'BUTTON' || e.target.closest('.post-actions')) {
                return;
            }

            const postUrl = card.dataset.url;
            const postTitle = card.dataset.title;
            const blogName = card.dataset.blog;
            const isTwitterPost = card.classList.contains('twitter-post');

            // Twitter posts: open directly in new tab (no reader)
            if (isTwitterPost) {
                window.open(postUrl, '_blank', 'noopener,noreferrer');
                return;
            }

            // Regular posts: mark as cleared and open in reader
            markAsCleared(postUrl);
            displayPosts(allPosts);

            // Open in article reader
            if (window.articleReader && typeof window.articleReader.open === 'function') {
                window.articleReader.open(postUrl, postTitle, blogName);
            } else {
                // Fallback: open in new tab
                console.warn('ArticleReader not ready, opening in new tab');
                window.open(postUrl, '_blank', 'noopener,noreferrer');
            }
        };

        // Make entire card clickable
        card.addEventListener('click', openArticle);
    });
}

function attachActionButtonHandlers() {
    // Pending buttons (read later)
    document.querySelectorAll('.pending-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;
            markAsPending(postUrl);
            displayPosts(allPosts);
        });
    });

    // Clear buttons (skip/archive)
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;
            markAsCleared(postUrl);
            displayPosts(allPosts);
        });
    });

    // Favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;
            markAsFavorite(postUrl);
            displayPosts(allPosts);
        });
    });

    // Move to inbox buttons
    document.querySelectorAll('.inbox-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;
            markAsInbox(postUrl);
            displayPosts(allPosts);
        });
    });

    // Delete manual article buttons
    document.querySelectorAll('.delete-manual-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;

            if (confirm('Are you sure you want to delete this article?')) {
                // Delete from manual articles list
                deleteManualArticle(postUrl);

                // Refresh display
                init();
            }
        });
    });
}

// ============================================================
// INITIALIZATION
// ============================================================

async function init(forceRefresh = false) {
    try {
        const loading = document.getElementById('loading');
        const postsContainer = document.getElementById('posts');

        // If not authenticated, show sign-in prompt immediately
        if (!isAuthenticated()) {
            loading.style.display = 'none';
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h2>Welcome to Partículas elementales</h2>
                    <p>Sign in with Google to sync your RSS feeds, saved articles, and reading progress across devices.</p>
                </div>
            `;
            return;
        }

        // Show skeleton loading (only if authenticated)
        showSkeletonPosts(5);
        loading.textContent = 'Loading posts';
        loading.style.display = 'block';

        // Load data from cloud
        // Note: "Syncing data..." message is more visible on mobile due to higher network latency.
        // On desktop with fast connections, cloud operations complete too quickly to notice.
        updateStatus('Syncing data...');
        await loadBlogsFromCloud();
        await loadPostStatusesFromCloud();
        await loadManualArticlesFromCloud();
        await loadInterestsFromCloud();
        // Load highlights if article reader is ready
        if (window.articleReader && window.articleReader.loadHighlightsFromCloud) {
            await window.articleReader.loadHighlightsFromCloud();
        }

        // Get blogs (from cache/localStorage)
        const blogs = getBlogs();

        // Get manual articles (excluding Twitter bookmarks - those are in separate section)
        const manualArticles = getManualArticles().filter(a => a.source !== 'twitter');

        // Restore Date objects in manual articles (from localStorage)
        manualArticles.forEach(article => {
            if (article.date && typeof article.date === 'string') {
                article.date = new Date(article.date);
            }
            article.isManual = true; // Ensure flag is set
        });

        if (blogs.length === 0 && manualArticles.length === 0) {
            loading.style.display = 'none';
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h2>No content configured</h2>
                    <p>Click the settings icon to add RSS feeds or individual articles.</p>
                </div>
            `;
            return;
        }

        let rssPost = [];

        // Only fetch RSS posts if we have blogs configured
        if (blogs.length > 0) {
            // Try to load from cache first (unless force refresh)
            if (!forceRefresh) {
                const cachedPosts = getPostsCache();
                if (cachedPosts && cachedPosts.length > 0) {
                    console.log('Using cached RSS posts');
                    rssPost = cachedPosts;
                }
            }

            // Cache miss or force refresh - fetch from network
            if (rssPost.length === 0) {
                updateStatus('Fetching feeds...');

                // Fetch all feeds in parallel
                const feedPromises = blogs.map(blog => fetchFeed(blog));
                const feedResults = await Promise.all(feedPromises);

                updateStatus('Parsing posts...');

                // Parse all feeds and combine posts
                rssPost = feedResults.flatMap(result => parseFeed(result));

                console.log(`Total RSS posts found: ${rssPost.length}`);

                const successCount = feedResults.filter(r => r.success).length;
                console.log(`Successfully loaded ${successCount} out of ${blogs.length} blogs`);

                // Save to cache
                savePostsCache(rssPost, blogs);
            }
        }

        // Combine RSS posts and manual articles
        allPosts = [...rssPost, ...manualArticles];
        console.log(`Total posts (RSS + Manual): ${allPosts.length} (${rssPost.length} + ${manualArticles.length})`);

        // Display posts based on current filter
        if (currentFilter === 'twitter') {
            displayTwitterPosts();
        } else if (currentFilter === 'highlights') {
            displayHighlights();
        } else {
            displayPosts(allPosts);
        }

    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('loading').innerHTML = `
            <div class="error">
                <h2>Failed to load posts</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// BLOG MANAGEMENT UI
// ============================================================

function openBlogManagement() {
    const modal = document.getElementById('blog-management-modal');
    modal.classList.add('active');
    renderBlogList();
    loadUserInterests();
}

function closeBlogManagement() {
    const modal = document.getElementById('blog-management-modal');
    modal.classList.remove('active');
}

// ============================================================
// USER INTERESTS
// ============================================================

function loadUserInterests() {
    const textarea = document.getElementById('user-interests');
    if (!textarea) return;

    // Load from localStorage
    const interests = localStorage.getItem('userInterests') || '';
    textarea.value = interests;

    // If logged in, try to load from cloud (will overwrite if found)
    if (isAuthenticated()) {
        loadInterestsFromCloud();
    }
}

async function loadInterestsFromCloud() {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { data, error } = await supabase
            .from('user_settings')
            .select('interests')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error loading interests:', error);
            return;
        }

        if (data?.interests) {
            // Always save to localStorage
            localStorage.setItem('userInterests', data.interests);
            // Update textarea if modal is open
            const textarea = document.getElementById('user-interests');
            if (textarea) {
                textarea.value = data.interests;
            }
        }
    } catch (e) {
        console.error('Failed to load interests from cloud:', e);
    }
}

async function saveUserInterests() {
    const textarea = document.getElementById('user-interests');
    if (!textarea) return;

    const newInterests = textarea.value.trim();
    const currentInterests = localStorage.getItem('userInterests') || '';

    // Check if interests actually changed
    if (newInterests !== currentInterests) {
        // Show confirmation dialog
        const confirmed = confirm(
            'Si cambias tus intereses, las recomendaciones se recalcularán.\n\n' +
            '¿Deseas continuar?'
        );

        if (!confirmed) {
            // Restore original value
            textarea.value = currentInterests;
            return;
        }

        // Clear summary caches (local and cloud)
        await clearSummaryCaches();
    }

    // Save to localStorage
    localStorage.setItem('userInterests', newInterests);

    // Save to cloud if logged in
    if (isAuthenticated()) {
        saveInterestsToCloud(newInterests);
    }

    // Show feedback
    const btn = document.querySelector('.save-interests-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 1500);
}

async function clearSummaryCaches() {
    // Clear local cache
    localStorage.removeItem('summaryCache');

    // Clear cloud cache if authenticated
    if (isAuthenticated()) {
        try {
            const supabase = getSupabaseClient();
            const user = getUser();

            const { error } = await supabase
                .from('summaries')
                .delete()
                .eq('user_id', user.id);

            if (error) {
                console.error('Error clearing cloud summaries:', error);
            }
        } catch (e) {
            console.error('Failed to clear cloud summaries:', e);
        }
    }
}

async function saveInterestsToCloud(interests) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                interests: interests,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Error saving interests to cloud:', error);
        } else {
            console.log('Interests saved to cloud');
        }
    } catch (e) {
        console.error('Failed to save interests to cloud:', e);
    }
}

function getUserInterests() {
    return localStorage.getItem('userInterests') || '';
}

function renderBlogList() {
    const blogs = getBlogs();
    const blogListDiv = document.getElementById('blog-list');

    if (blogs.length === 0) {
        blogListDiv.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <p style="color: var(--ink-gray); font-size: 14px;">No blogs added yet. Add your first blog below!</p>
            </div>
        `;
        return;
    }

    blogListDiv.innerHTML = blogs.map((blog, index) => `
        <div class="blog-item">
            <div class="blog-info">
                <div class="blog-info-name">${escapeHtml(blog.name)}</div>
                <div class="blog-info-url">${escapeHtml(blog.url)}</div>
            </div>
            <button class="delete-blog-btn" onclick="deleteBlog(${index})">
                Delete
            </button>
        </div>
    `).join('');
}

async function addNewBlog() {
    const nameInput = document.getElementById('blog-name');
    const urlInput = document.getElementById('blog-url');
    const addBtn = document.querySelector('.add-blog-btn');

    const name = nameInput.value.trim();
    let url = urlInput.value.trim();

    // Validation
    if (!name) {
        alert('Please enter a blog name');
        return;
    }

    if (!url) {
        alert('Please enter a blog or RSS feed URL');
        return;
    }

    // Basic URL validation
    try {
        new URL(url);
    } catch (e) {
        alert('Please enter a valid URL');
        return;
    }

    // Check if URL looks like a feed URL
    const isFeedUrl = /\/(feed|rss|atom)(\.xml)?\/?\s*$/i.test(url) ||
                      /\.(xml|rss|atom)\s*$/i.test(url) ||
                      url.includes('/feed/') ||
                      url.includes('substack.com/feed');

    // If not a feed URL, try to discover it
    if (!isFeedUrl) {
        addBtn.textContent = 'Discovering feed...';
        addBtn.disabled = true;

        try {
            const response = await fetch(
                `${window.API_BASE_URL}/api/discover-feed?url=${encodeURIComponent(url)}`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.feeds && data.feeds.length > 0) {
                    url = data.feeds[0].url;
                    console.log('Discovered feed URL:', url);
                }
            } else {
                const error = await response.json();
                alert(`Could not find RSS feed: ${error.message}\n\nTry entering the direct RSS feed URL instead.`);
                addBtn.textContent = 'Add Blog';
                addBtn.disabled = false;
                return;
            }
        } catch (e) {
            console.error('Feed discovery error:', e);
            alert('Could not discover RSS feed. Try entering the direct RSS feed URL instead.');
            addBtn.textContent = 'Add Blog';
            addBtn.disabled = false;
            return;
        }

        addBtn.textContent = 'Add Blog';
        addBtn.disabled = false;
    }

    // Check for duplicates
    const blogs = getBlogs();
    if (blogs.some(blog => blog.url === url)) {
        alert('This blog is already in your list');
        return;
    }

    // Add the blog
    const newBlog = {
        name: name,
        slug: generateSlug(name),
        url: url
    };

    blogs.push(newBlog);
    saveBlogs(blogs);

    // Clear inputs
    nameInput.value = '';
    urlInput.value = '';

    // Refresh the list
    renderBlogList();

    // Clear cache since blogs changed
    clearPostsCache();

    // Show success message
    alert('Blog added successfully! Refreshing posts...');

    // Reload posts with force refresh
    init(true);
}

function deleteBlog(index) {
    const blogs = getBlogs();
    const blogName = blogs[index].name;

    if (confirm(`Are you sure you want to remove "${blogName}"?`)) {
        blogs.splice(index, 1);
        saveBlogs(blogs);
        renderBlogList();

        // Clear cache since blogs changed
        clearPostsCache();

        // Reload posts with force refresh
        init(true);
    }
}

// Refresh posts - checks for new posts without losing current view
function refreshPosts() {
    const refreshBtn = document.getElementById('refresh-btn');

    // Add spinning animation to button if it exists
    if (refreshBtn) {
        refreshBtn.style.animation = 'spin 1s linear infinite';
    }

    console.log('Checking for new posts...');
    checkForNewPosts().then(() => {
        // Remove animation when done
        setTimeout(() => {
            if (refreshBtn) {
                refreshBtn.style.animation = '';
            }
            // Hide pull indicator (mobile)
            hidePullIndicator();
        }, 500);
    }).catch((error) => {
        console.error('Error checking for new posts:', error);
        if (refreshBtn) {
            refreshBtn.style.animation = '';
        }
        // Hide pull indicator on error too
        hidePullIndicator();
    });
}

// Force refresh - completely reload all posts (used when blogs change)
function forceRefreshPosts() {
    clearPostsCache();
    init(true);
}

// Handle URL parameters from browser extension
async function handleExtensionParams() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (!action) return false;

    // Clear URL params without reload
    window.history.replaceState({}, document.title, window.location.pathname);

    // Check if user is authenticated
    if (!isAuthenticated()) {
        alert('Please sign in first to add articles or blogs.');
        return true;
    }

    if (action === 'add-article') {
        const url = params.get('url');
        const title = params.get('title');

        if (url) {
            // Open settings modal and pre-fill article URL
            openBlogManagement();

            // Wait for modal to render
            setTimeout(() => {
                const urlInput = document.getElementById('article-url');
                if (urlInput) {
                    urlInput.value = decodeURIComponent(url);
                    urlInput.focus();

                    // Show a hint
                    alert(`Article URL pre-filled: "${decodeURIComponent(title || url)}"\n\nClick "Add Article" to save it.`);
                }
            }, 100);
        }
        return true;
    }

    if (action === 'add-blog') {
        const url = params.get('url');
        const name = params.get('name');

        if (url) {
            // Open settings modal and pre-fill blog info
            openBlogManagement();

            // Wait for modal to render
            setTimeout(() => {
                const nameInput = document.getElementById('blog-name');
                const urlInput = document.getElementById('blog-url');

                if (nameInput && urlInput) {
                    nameInput.value = decodeURIComponent(name || '');
                    urlInput.value = decodeURIComponent(url);
                    nameInput.focus();

                    // Show a hint
                    alert(`RSS feed detected!\n\nName: ${decodeURIComponent(name || 'Unknown')}\nURL: ${decodeURIComponent(url)}\n\nClick "Add Blog" to subscribe.`);
                }
            }, 100);
        }
        return true;
    }

    return false;
}

// ============================================================
// HIGHLIGHTS SECTION
// ============================================================

/**
 * Get total highlights count
 */
function getHighlightsCount() {
    if (!window.articleReader || !window.articleReader.highlights) {
        return 0;
    }

    let count = 0;
    for (const url in window.articleReader.highlights) {
        count += window.articleReader.highlights[url].length;
    }
    return count;
}

/**
 * Get all highlights from ArticleReader
 */
function getAllHighlights() {
    if (!window.articleReader || !window.articleReader.highlights) {
        return [];
    }

    const highlightsObj = window.articleReader.highlights;
    const allHighlights = [];

    for (const articleUrl in highlightsObj) {
        const articleMeta = getArticleMetadata(articleUrl);
        const articleHighlights = highlightsObj[articleUrl];

        articleHighlights.forEach((highlight, index) => {
            allHighlights.push({
                articleUrl,
                text: highlight.text,
                position: highlight.position,
                timestamp: highlight.timestamp,
                articleTitle: articleMeta.title,
                blogName: articleMeta.blogName,
                index
            });
        });
    }

    // Sort by timestamp (newest first)
    return allHighlights.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get article metadata from caches
 */
function getArticleMetadata(articleUrl) {
    // Check posts cache
    try {
        const cache = JSON.parse(localStorage.getItem('blogAggregator_postsCache') || '{}');
        const post = (cache.posts || []).find(p => p.link === articleUrl);
        if (post) return { title: post.title, blogName: post.blogName };
    } catch (e) {}

    // Check manual articles
    try {
        const manualArticles = JSON.parse(localStorage.getItem('blogAggregator_manualArticles') || '[]');
        const manual = manualArticles.find(a => a.link === articleUrl);
        if (manual) return { title: manual.title, blogName: manual.blogName || manual.siteName || 'Manual' };
    } catch (e) {}

    // Fallback: extract domain
    try {
        const url = new URL(articleUrl);
        return { title: 'Unknown Article', blogName: url.hostname.replace('www.', '') };
    } catch {
        return { title: 'Unknown Article', blogName: 'Unknown Source' };
    }
}

/**
 * Render highlights in the settings modal
 */
/**
 * Display highlights in the posts container
 */
function displayHighlights() {
    const postsContainer = document.getElementById('posts');
    const loadingIndicator = document.getElementById('loading');

    loadingIndicator.style.display = 'none';

    const highlights = getAllHighlights();

    // Update filter counts
    updateFilterCounts(allPosts);

    if (highlights.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No highlights yet</h2>
                <p>Select text while reading an article and click "Highlight" to save passages for later.</p>
            </div>
        `;
        return;
    }

    // Add section header with count
    const headerHtml = `
        <div class="highlights-section-header">
            <span class="highlights-count">${highlights.length} highlight${highlights.length !== 1 ? 's' : ''}</span>
            <button class="highlights-clear-all-btn" onclick="clearAllHighlights()">
                Clear All
            </button>
        </div>
    `;

    // Render highlights
    postsContainer.innerHTML = headerHtml + highlights.map(h => `
        <article class="post-card highlight-card"
                 data-article-url="${escapeHtml(h.articleUrl)}"
                 data-highlight-position="${h.position}">
            <div class="post-header">
                <span class="blog-source">${escapeHtml(h.blogName)}</span>
                <span class="highlight-date">${formatDate(new Date(h.timestamp))}</span>
            </div>

            <blockquote class="highlight-text-display">
                "${escapeHtml(h.text)}"
            </blockquote>

            <div class="highlight-article-link">
                From: <span class="highlight-article-title">${escapeHtml(h.articleTitle)}</span>
            </div>

            <div class="post-actions">
                <button class="action-icon-btn open-highlight-btn"
                        data-url="${escapeHtml(h.articleUrl)}"
                        data-title="${escapeHtml(h.articleTitle)}"
                        data-blog="${escapeHtml(h.blogName)}"
                        title="Open article">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </button>
                <button class="action-icon-btn delete-highlight-btn"
                        data-url="${escapeHtml(h.articleUrl)}"
                        data-position="${h.position}"
                        title="Delete highlight">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </article>
    `).join('');

    // Attach handlers
    attachHighlightCardHandlers();
}

/**
 * Attach click handlers for highlight cards
 */
function attachHighlightCardHandlers() {
    // Open article buttons
    document.querySelectorAll('.open-highlight-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            const title = btn.dataset.title;
            const blog = btn.dataset.blog;

            if (window.articleReader) {
                window.articleReader.open(url, title, blog);
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-highlight-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            const position = parseInt(btn.dataset.position, 10);

            if (confirm('Delete this highlight?')) {
                deleteHighlightFromList(url, position);
                displayHighlights(); // Refresh the view
            }
        });
    });

    // Card click opens article
    document.querySelectorAll('.highlight-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.post-actions')) return;

            const openBtn = card.querySelector('.open-highlight-btn');
            if (openBtn) {
                openBtn.click();
            }
        });
    });
}


/**
 * Delete a highlight from the list
 */
function deleteHighlightFromList(articleUrl, position) {
    if (!window.articleReader) return;

    const highlights = window.articleReader.highlights;
    if (highlights[articleUrl]) {
        const highlight = highlights[articleUrl].find(h => h.position === position);
        highlights[articleUrl] = highlights[articleUrl].filter(h => h.position !== position);

        // Clean up empty arrays
        if (highlights[articleUrl].length === 0) {
            delete highlights[articleUrl];
        }

        // Save to storage
        window.articleReader.saveHighlightsToStorage();

        // Delete from cloud - pass articleUrl explicitly
        if (highlight && typeof isAuthenticated === 'function' && isAuthenticated()) {
            window.articleReader.deleteHighlightFromCloud(highlight.text, position, articleUrl);
        }
    }
}

/**
 * Clear all highlights (with confirmation)
 */
function clearAllHighlights() {
    if (!confirm('Are you sure you want to delete ALL highlights? This cannot be undone.')) {
        return;
    }

    if (window.articleReader) {
        window.articleReader.highlights = {};
        window.articleReader.saveHighlightsToStorage();

        // Clear from cloud if authenticated
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            clearAllHighlightsFromCloud();
        }
    }

    displayHighlights();
}

/**
 * Clear all highlights from Supabase
 */
async function clearAllHighlightsFromCloud() {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        await supabase
            .from('highlights')
            .delete()
            .eq('user_id', user.id);

        console.log('All highlights cleared from cloud');
    } catch (e) {
        console.error('Failed to clear highlights from cloud:', e);
    }
}

// ============================================================
// HIGHLIGHTS PAGE (Dedicated fullscreen view)
// ============================================================

function openHighlightsPage() {
    const page = document.getElementById('highlights-page');
    if (page) {
        page.classList.add('open');
        renderHighlightsPage();
    }
}

function closeHighlightsPage() {
    const page = document.getElementById('highlights-page');
    if (page) {
        page.classList.remove('open');
    }
}

function renderHighlightsPage() {
    const listContainer = document.getElementById('highlights-list');
    const emptyState = document.getElementById('highlights-empty');

    if (!listContainer || !emptyState) return;

    const highlights = getAllHighlights();

    if (highlights.length === 0) {
        listContainer.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    listContainer.innerHTML = highlights.map(h => `
        <div class="highlight-card"
             data-article-url="${escapeHtml(h.articleUrl)}"
             data-article-title="${escapeHtml(h.articleTitle)}"
             data-blog-name="${escapeHtml(h.blogName)}">
            <div class="highlight-card-text">${escapeHtml(h.text)}</div>
            <div class="highlight-card-meta">
                <span class="highlight-card-source">${escapeHtml(h.blogName)}</span>
                <span class="highlight-card-date">${formatDate(new Date(h.timestamp))}</span>
                <button class="highlight-card-delete"
                        data-url="${escapeHtml(h.articleUrl)}"
                        data-position="${h.position}"
                        title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    // Attach handlers
    attachHighlightsPageHandlers();
}

function attachHighlightsPageHandlers() {
    // Card click opens article
    document.querySelectorAll('#highlights-list .highlight-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.highlight-card-delete')) return;

            const url = card.dataset.articleUrl;
            const title = card.dataset.articleTitle;
            const blog = card.dataset.blogName;

            closeHighlightsPage();

            if (window.articleReader) {
                window.articleReader.open(url, title, blog);
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });
    });

    // Delete buttons
    document.querySelectorAll('#highlights-list .highlight-card-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            const position = parseInt(btn.dataset.position, 10);

            if (confirm('Eliminar este highlight?')) {
                deleteHighlightFromList(url, position);
                renderHighlightsPage();
            }
        });
    });
}

// ============================================================
// PULL-TO-REFRESH (Mobile)
// ============================================================

let pullStartY = 0;
let isPulling = false;
const PULL_THRESHOLD = 80;

function showPullIndicator(distance) {
    const indicator = document.getElementById('pull-indicator');
    if (!indicator) return;

    // Show indicator proportionally to pull distance
    const progress = Math.min(distance / PULL_THRESHOLD, 1);

    // Move indicator down as user pulls (Twitter-style)
    indicator.style.transform = `translateY(${-60 + (progress * 60)}px)`;

    // Update arc progress (stroke-dashoffset: 62.83 = empty, 0 = full)
    const arc = indicator.querySelector('.pull-spinner-arc');
    if (arc) {
        const circumference = 62.83;
        const offset = circumference * (1 - progress);
        arc.style.strokeDashoffset = offset;
    }
}

function hidePullIndicator() {
    const indicator = document.getElementById('pull-indicator');
    if (!indicator) return;

    indicator.classList.remove('loading');
    indicator.style.transform = 'translateY(-60px)';

    // Reset arc
    const arc = indicator.querySelector('.pull-spinner-arc');
    if (arc) {
        arc.style.strokeDashoffset = 62.83;
    }
}

function showPullIndicatorLoading() {
    const indicator = document.getElementById('pull-indicator');
    if (!indicator) return;

    indicator.classList.add('loading');
    indicator.style.transform = 'translateY(0)';
}

function initPullToRefresh() {
    // Only on mobile
    if (window.innerWidth > 768) return;

    const postsContainer = document.getElementById('posts');
    if (!postsContainer) return;

    postsContainer.addEventListener('touchstart', (e) => {
        // Only activate when scrolled to top
        if (window.scrollY === 0) {
            pullStartY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    postsContainer.addEventListener('touchmove', (e) => {
        if (!isPulling) return;

        const pullDistance = e.touches[0].clientY - pullStartY;

        // Only show indicator when pulling down at the top
        if (pullDistance > 0 && window.scrollY === 0) {
            showPullIndicator(pullDistance);
        }
    }, { passive: true });

    postsContainer.addEventListener('touchend', (e) => {
        if (!isPulling) return;
        isPulling = false;

        const pullDistance = e.changedTouches[0].clientY - pullStartY;

        // Trigger refresh if pulled past threshold
        if (pullDistance > PULL_THRESHOLD && window.scrollY === 0) {
            showPullIndicatorLoading();
            refreshPosts();
        } else {
            hidePullIndicator();
        }
    });

    // Also listen on document for when touch ends outside container
    document.addEventListener('touchend', () => {
        if (isPulling) {
            isPulling = false;
            hidePullIndicator();
        }
    });
}

// Start the app when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Create new posts banner
    createNewPostsBanner();

    // Initialize pull-to-refresh for mobile
    initPullToRefresh();

    // Initialize authentication first
    if (typeof initAuth === 'function') {
        await initAuth();
    }

    // Handle extension parameters (after auth)
    await handleExtensionParams();

    // Then load posts
    init();
});
