/**
 * Partículas elementales - Main Application
 * Blog aggregator with Kindle-inspired eReader
 */

// ============================================================
// CONFIGURATION
// ============================================================

// Backend API URL (set this before deploying)
window.API_BASE_URL = 'https://particulas-backend.onrender.com';

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
    if (blogsCache !== null) {
        return blogsCache;
    }
    // Fallback to localStorage if cache not loaded
    const stored = localStorage.getItem('blogAggregator_blogs');
    if (stored) {
        return JSON.parse(stored);
    }
    // Only return defaults for logged-out users
    if (!isAuthenticated()) {
        saveBlogs(DEFAULT_BLOGS);
        return DEFAULT_BLOGS;
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
            blogsCache = [];
            return;
        }

        console.log('Loaded blogs from cloud:', data?.length || 0);
        blogsCache = data || [];

        // Also update localStorage as cache
        localStorage.setItem('blogAggregator_blogs', JSON.stringify(blogsCache));
    } catch (error) {
        console.error('Failed to load blogs from cloud:', error);
        blogsCache = [];
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const postDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today - postDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ============================================================
// POST STATUS MANAGEMENT (Inbox/Read/Not Relevant)
// ============================================================

// Post status constants
const POST_STATUS = {
    INBOX: 'inbox',
    READ: 'read',
    NOT_RELEVANT: 'not_relevant'
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
    return stored ? JSON.parse(stored) : {};
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

function markAsRead(postLink) {
    setPostStatus(postLink, POST_STATUS.READ);
}

function markAsNotRelevant(postLink) {
    setPostStatus(postLink, POST_STATUS.NOT_RELEVANT);
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
            postStatusesCache = {};
            return;
        }

        // Convert array to object
        const statuses = {};
        (data || []).forEach(item => {
            statuses[item.post_url] = item.status;
        });

        console.log('Loaded post statuses from cloud:', Object.keys(statuses).length);
        postStatusesCache = statuses;
        localStorage.setItem('blogAggregator_postStatuses', JSON.stringify(statuses));
    } catch (error) {
        console.error('Failed to load post statuses from cloud:', error);
        postStatusesCache = {};
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
        read: 0,
        not_relevant: 0
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
            read: 'Read',
            not_relevant: 'Not Relevant'
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
        const statusClass = status === POST_STATUS.READ ? 'read' : '';

        return `
            <article class="post-card ${statusClass}"
                     data-url="${escapeHtml(post.link)}"
                     data-title="${escapeHtml(post.title)}"
                     data-blog="${escapeHtml(post.blogName)}">
                <div class="post-header">
                    <span class="blog-source">${escapeHtml(post.blogName)}</span>
                </div>
                <h2 class="post-title">${escapeHtml(post.title)}</h2>
                <div class="post-meta">
                    <span class="post-date">${formatDate(post.date)}</span>
                </div>
                <p class="post-description">${escapeHtml(post.description)}</p>
                <div class="post-actions">
                    ${status === POST_STATUS.INBOX ? `
                        <button class="action-btn read-btn" data-url="${escapeHtml(post.link)}" title="Mark as read">
                            ✓ Mark Read
                        </button>
                        <button class="action-btn not-relevant-btn" data-url="${escapeHtml(post.link)}" title="Skip this post">
                            × Skip
                        </button>
                    ` : ''}
                    ${status === POST_STATUS.READ ? `
                        <button class="action-btn inbox-btn" data-url="${escapeHtml(post.link)}" title="Move to inbox">
                            ↩ Move to Inbox
                        </button>
                    ` : ''}
                    ${status === POST_STATUS.NOT_RELEVANT ? `
                        <button class="action-btn inbox-btn" data-url="${escapeHtml(post.link)}" title="Move to inbox">
                            ↩ Move to Inbox
                        </button>
                    ` : ''}
                </div>
            </article>
        `;
    }).join('');

    // Attach click handlers
    attachPostClickHandlers();
    attachActionButtonHandlers();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
    displayPosts(allPosts);
}

function updateFilterCounts(posts) {
    const counts = getStatusCounts(posts);

    // Update count badges
    const inboxBtn = document.querySelector('[data-filter="inbox"]');
    const readBtn = document.querySelector('[data-filter="read"]');
    const notRelevantBtn = document.querySelector('[data-filter="not_relevant"]');

    if (inboxBtn) {
        const badge = inboxBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.inbox;
    }
    if (readBtn) {
        const badge = readBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.read;
    }
    if (notRelevantBtn) {
        const badge = notRelevantBtn.querySelector('.count-badge');
        if (badge) badge.textContent = counts.not_relevant;
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

            // Mark as read when opening article
            markAsRead(postUrl);

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
    // Read buttons
    document.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;
            markAsRead(postUrl);
            displayPosts(allPosts);
        });
    });

    // Not relevant buttons
    document.querySelectorAll('.not-relevant-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postUrl = btn.dataset.url;
            markAsNotRelevant(postUrl);
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
}

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    try {
        // Show skeleton loading
        showSkeletonPosts(5);

        const loading = document.getElementById('loading');
        loading.textContent = 'Loading posts';
        loading.style.display = 'block';

        // Load data from cloud if logged in
        if (isAuthenticated()) {
            updateStatus('Syncing data...');
            await loadBlogsFromCloud();
            await loadPostStatusesFromCloud();
            // Load highlights if article reader is ready
            if (window.articleReader && window.articleReader.loadHighlightsFromCloud) {
                await window.articleReader.loadHighlightsFromCloud();
            }
        }

        // Get blogs (from cache/localStorage)
        const blogs = getBlogs();

        if (blogs.length === 0) {
            document.getElementById('loading').innerHTML = `
                <div class="empty-state">
                    <h2>No blogs configured</h2>
                    <p>Add some RSS feeds to get started.</p>
                </div>
            `;
            return;
        }

        updateStatus('Fetching feeds...');

        // Fetch all feeds in parallel
        const feedPromises = blogs.map(blog => fetchFeed(blog));
        const feedResults = await Promise.all(feedPromises);

        updateStatus('Parsing posts...');

        // Parse all feeds and combine posts
        const allPosts = feedResults.flatMap(result => parseFeed(result));

        console.log(`Total posts found: ${allPosts.length}`);

        const successCount = feedResults.filter(r => r.success).length;
        console.log(`Successfully loaded ${successCount} out of ${blogs.length} blogs`);

        // Display the posts
        displayPosts(allPosts);

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
}

function closeBlogManagement() {
    const modal = document.getElementById('blog-management-modal');
    modal.classList.remove('active');
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

    // Show success message
    alert('Blog added successfully! Refreshing posts...');

    // Reload posts
    init();
}

function deleteBlog(index) {
    const blogs = getBlogs();
    const blogName = blogs[index].name;

    if (confirm(`Are you sure you want to remove "${blogName}"?`)) {
        blogs.splice(index, 1);
        saveBlogs(blogs);
        renderBlogList();

        // Reload posts
        init();
    }
}

// Start the app when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize authentication first
    if (typeof initAuth === 'function') {
        await initAuth();
    }
    // Then load posts
    init();
});
