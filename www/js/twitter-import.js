/**
 * Twitter/X Bookmarks Import Module
 * Handles parsing and importing Twitter bookmarks exported via browser extensions
 */

// ============================================================
// TWITTER BOOKMARKS IMPORTER CLASS
// ============================================================

class TwitterBookmarksImporter {
    constructor() {
        this.bookmarks = [];
        this.existingUrls = new Set();
        this.duplicates = [];
        this.importOptions = {
            skipDuplicates: true
        };
    }

    /**
     * Parse JSON file exported from browser extension
     * Supports multiple export formats
     */
    parseJSON(jsonData) {
        if (!Array.isArray(jsonData)) {
            throw new Error('Invalid format: expected an array of bookmarks');
        }

        this.bookmarks = jsonData.map(item => this.normalizeBookmark(item));
        return this.bookmarks;
    }

    /**
     * Normalize different export formats to common structure
     * Supports: X Bookmarks Exporter, twitter-web-exporter, and others
     */
    normalizeBookmark(rawBookmark) {
        // Handle different field names from various exporters
        const tweetUrl = this.normalizeUrl(
            rawBookmark.url || rawBookmark.link || rawBookmark.tweetUrl || ''
        );

        // Get text content (twitter-web-exporter uses full_text)
        const text = rawBookmark.full_text || rawBookmark.tweetText || rawBookmark.text || rawBookmark.content || '';

        // Get author info (twitter-web-exporter uses name/screen_name)
        const authorName = rawBookmark.name || rawBookmark.authorName || rawBookmark.author || '';
        const authorHandle = rawBookmark.screen_name || rawBookmark.handle || rawBookmark.screenName || rawBookmark.username || '';

        // Get date (twitter-web-exporter uses created_at)
        const dateStr = rawBookmark.created_at || rawBookmark.time || rawBookmark.createdAt || rawBookmark.timestamp;
        const date = dateStr ? new Date(dateStr) : new Date();

        // Get engagement data (twitter-web-exporter uses favorite_count, retweet_count, reply_count)
        const likes = parseInt(rawBookmark.favorite_count || rawBookmark.likes || rawBookmark.likeCount || rawBookmark.favoriteCount || 0) || 0;
        const retweets = parseInt(rawBookmark.retweet_count || rawBookmark.retweets || rawBookmark.retweetCount || 0) || 0;
        const replies = parseInt(rawBookmark.reply_count || rawBookmark.replies || rawBookmark.replyCount || 0) || 0;

        // Get profile image (twitter-web-exporter uses profile_image_url)
        const profileImage = rawBookmark.profile_image_url || rawBookmark.profileImageUrl || '';
        // Get higher resolution image by replacing _normal with _bigger or removing size suffix
        const profileImageHQ = profileImage.replace('_normal.', '_bigger.');

        // Get media (images/videos)
        const media = (rawBookmark.media || []).map(m => ({
            type: m.type || 'photo',
            url: m.original || m.url || m.thumbnail || '',
            thumbnail: m.thumbnail || m.url || ''
        })).filter(m => m.url);

        return {
            url: tweetUrl,
            title: this.extractTweetTitle({ ...rawBookmark, tweetText: text, authorName }),
            description: text,
            date: date,
            siteName: 'Twitter',
            source: 'twitter',
            authorName: authorName,
            authorHandle: authorHandle ? (authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`) : '',
            profileImage: profileImageHQ,
            media: media,
            engagementData: {
                retweets,
                likes,
                replies
            },
            isThread: !!(rawBookmark.in_reply_to || rawBookmark.quoted_status)
        };
    }

    /**
     * Normalize Twitter URLs (handle twitter.com and x.com variations)
     */
    normalizeUrl(url) {
        if (!url) return '';

        // Convert x.com to twitter.com for consistency
        url = url.replace('https://x.com/', 'https://twitter.com/');
        url = url.replace('http://x.com/', 'https://twitter.com/');

        // Remove tracking parameters
        try {
            const urlObj = new URL(url);
            urlObj.search = '';
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    /**
     * Extract meaningful title from tweet
     */
    extractTweetTitle(bookmark) {
        const text = bookmark.tweetText || bookmark.full_text || bookmark.text || bookmark.content || '';
        const authorName = bookmark.authorName || bookmark.name || bookmark.author || 'Unknown';

        if (!text) {
            return `Tweet by ${authorName}`;
        }

        // Remove t.co URLs for cleaner title
        const cleanText = text.replace(/https?:\/\/t\.co\/\w+/g, '').trim();

        if (!cleanText) {
            return `Tweet by ${authorName}`;
        }

        // Use first sentence or truncate
        const firstSentence = cleanText.split(/[.!?\n]/)[0].trim();
        const truncated = firstSentence.length > 100
            ? firstSentence.substring(0, 97) + '...'
            : firstSentence;

        return truncated || `Tweet by ${authorName}`;
    }

    /**
     * Check for duplicates against existing Twitter bookmarks
     */
    async checkDuplicates() {
        // Get existing Twitter bookmarks from manual articles
        const manualArticles = getManualArticles();
        const twitterArticles = manualArticles.filter(a => a.source === 'twitter');
        this.existingUrls = new Set(twitterArticles.map(a => a.link));

        this.duplicates = this.bookmarks.filter(b => this.existingUrls.has(b.url));

        return {
            total: this.bookmarks.length,
            new: this.bookmarks.length - this.duplicates.length,
            duplicates: this.duplicates.length
        };
    }

    /**
     * Get bookmarks to import based on options
     */
    getBookmarksToImport() {
        if (this.importOptions.skipDuplicates) {
            return this.bookmarks.filter(b => !this.existingUrls.has(b.url));
        }
        return this.bookmarks;
    }

    /**
     * Import bookmarks with progress tracking
     */
    async importBookmarks(progressCallback) {
        const toImport = this.getBookmarksToImport();
        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < toImport.length; i++) {
            const bookmark = toImport[i];

            try {
                const article = {
                    title: bookmark.title,
                    link: bookmark.url,
                    date: bookmark.date,
                    description: bookmark.description,
                    blogName: bookmark.siteName,
                    blogSlug: 'twitter',
                    isManual: true,
                    source: 'twitter',
                    authorName: bookmark.authorName,
                    authorHandle: bookmark.authorHandle,
                    profileImage: bookmark.profileImage,
                    media: bookmark.media,
                    engagementData: bookmark.engagementData,
                    isThread: bookmark.isThread || false
                };

                const added = await addTwitterBookmark(article);

                if (added) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push(`${bookmark.title}: Already exists`);
                }

            } catch (error) {
                results.failed++;
                results.errors.push(`${bookmark.title}: ${error.message}`);
            }

            if (progressCallback) {
                progressCallback(i + 1, toImport.length);
            }

            // Batch delay to avoid overwhelming browser
            if (i % 10 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        return results;
    }

    /**
     * Reset importer state
     */
    reset() {
        this.bookmarks = [];
        this.existingUrls = new Set();
        this.duplicates = [];
    }
}

// Global importer instance
let twitterImporter = new TwitterBookmarksImporter();

// ============================================================
// TWITTER BOOKMARKS STORAGE
// ============================================================

/**
 * Add a Twitter bookmark to manual articles
 */
async function addTwitterBookmark(article) {
    const articles = getManualArticles();

    // Check for duplicates
    if (articles.some(a => a.link === article.link)) {
        return false;
    }

    articles.unshift(article);
    saveManualArticles(articles);

    // Sync to cloud if logged in
    if (isAuthenticated()) {
        skipNextManualArticlesCloudLoad = true;
        await saveTwitterBookmarkToCloud(article);
    }

    return true;
}

/**
 * Save Twitter bookmark to Supabase with Twitter-specific fields
 */
async function saveTwitterBookmarkToCloud(article) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const articleData = {
            user_id: user.id,
            url: article.link,
            title: article.title,
            description: article.description,
            date: article.date instanceof Date ? article.date.toISOString() : article.date,
            site_name: article.blogName,
            source: 'twitter',
            author_name: article.authorName || null,
            author_handle: article.authorHandle || null,
            profile_image: article.profileImage || null,
            media: article.media || null,
            engagement_data: article.engagementData || null,
            is_thread: article.isThread || false,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('manual_articles')
            .upsert(articleData, { onConflict: 'user_id,url' });

        if (error) {
            // Silent fail - cloud sync is best-effort
        }
    } catch (error) {
        // Silent fail - cloud sync is best-effort
    }
}

/**
 * Get Twitter bookmarks from manual articles
 */
function getTwitterBookmarks() {
    const articles = getManualArticles();
    return articles.filter(a => a.source === 'twitter');
}

/**
 * Get count of Twitter bookmarks
 */
function getTwitterBookmarksCount() {
    return getTwitterBookmarks().length;
}

// ============================================================
// MODAL UI CONTROLS
// ============================================================

function openTwitterImportModal() {
    if (!isAuthenticated()) {
        alert('Please sign in first to import Twitter bookmarks.');
        return;
    }

    const modal = document.getElementById('twitter-import-modal');
    modal.classList.add('active');
    resetTwitterImport();
}

function closeTwitterImportModal() {
    const modal = document.getElementById('twitter-import-modal');
    modal.classList.remove('active');
    twitterImporter.reset();
}

function showTwitterImportStep(stepNumber) {
    const steps = document.querySelectorAll('.twitter-import-step');
    steps.forEach(step => {
        step.style.display = step.dataset.step === String(stepNumber) ? 'block' : 'none';
    });
}

function resetTwitterImport() {
    twitterImporter.reset();
    showTwitterImportStep(1);

    // Reset file input
    const fileInput = document.getElementById('twitter-file-input');
    if (fileInput) fileInput.value = '';
}

// ============================================================
// FILE HANDLING
// ============================================================

function handleTwitterFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        alert('Please select a JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            twitterImporter.parseJSON(jsonData);

            // Check duplicates
            const stats = await twitterImporter.checkDuplicates();

            // Update UI
            document.getElementById('twitter-total-count').textContent = stats.total;
            document.getElementById('twitter-new-count').textContent = stats.new;
            document.getElementById('twitter-duplicate-count').textContent = stats.duplicates;

            // Show preview
            renderTwitterPreview();

            // Show step 2
            showTwitterImportStep(2);

        } catch (error) {
            alert('Failed to parse file: ' + error.message);
        }
    };
    reader.onerror = () => {
        alert('Error al leer el archivo. Intenta de nuevo.');
    };
    reader.readAsText(file);
}

function renderTwitterPreview() {
    const previewList = document.getElementById('twitter-preview-list');
    const bookmarks = twitterImporter.bookmarks.slice(0, 5);

    previewList.innerHTML = bookmarks.map(bookmark => `
        <div class="twitter-preview-item">
            <div class="twitter-preview-author">
                ${escapeHtml(bookmark.authorName || 'Unknown')}
                <span class="twitter-preview-handle">${escapeHtml(bookmark.authorHandle || '')}</span>
            </div>
            <div class="twitter-preview-text">${escapeHtml(bookmark.description.substring(0, 100))}${bookmark.description.length > 100 ? '...' : ''}</div>
        </div>
    `).join('');

    if (twitterImporter.bookmarks.length > 5) {
        previewList.innerHTML += `<p class="twitter-preview-more">...and ${twitterImporter.bookmarks.length - 5} more</p>`;
    }
}

// ============================================================
// IMPORT PROCESS
// ============================================================

async function startTwitterImport() {
    // Update options from UI
    twitterImporter.importOptions.skipDuplicates = document.getElementById('twitter-skip-duplicates').checked;

    // Show progress step
    showTwitterImportStep(3);

    const progressFill = document.getElementById('twitter-progress-fill');
    const progressText = document.getElementById('twitter-progress-text');

    try {
        const results = await twitterImporter.importBookmarks((current, total) => {
            const percent = Math.round((current / total) * 100);
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `Importing ${current} of ${total}...`;
        });

        // Show complete step
        showTwitterImportStep(4);
        document.getElementById('twitter-complete-message').textContent =
            `Successfully imported ${results.success} bookmark${results.success !== 1 ? 's' : ''}.` +
            (results.failed > 0 ? ` ${results.failed} failed.` : '');

        // Update Twitter count in filter
        updateTwitterFilterCount();

    } catch (error) {
        alert('Import failed: ' + error.message);
        resetTwitterImport();
    }
}

// ============================================================
// FILTER INTEGRATION
// ============================================================

/**
 * Update Twitter filter count badge
 */
function updateTwitterFilterCount() {
    const twitterBtn = document.querySelector('[data-filter="twitter"]');
    if (twitterBtn) {
        const badge = twitterBtn.querySelector('.count-badge');
        if (badge) {
            badge.textContent = getTwitterBookmarksCount();
        }
    }
}

// ============================================================
// FOLDERS MANAGEMENT
// ============================================================

const TWITTER_FOLDERS_KEY = 'twitter_folders';

function getTwitterFolders() {
    const stored = localStorage.getItem(TWITTER_FOLDERS_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveTwitterFolders(folders) {
    localStorage.setItem(TWITTER_FOLDERS_KEY, JSON.stringify(folders));
    if (isAuthenticated()) {
        saveTwitterFoldersToCloud(folders);
    }
}

function addTwitterFolder(name) {
    const folders = getTwitterFolders();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (folders.some(f => f.slug === slug)) {
        return false; // Already exists
    }

    folders.push({ name, slug });
    saveTwitterFolders(folders);
    return true;
}

function deleteTwitterFolder(slug) {
    const folders = getTwitterFolders();
    const filtered = folders.filter(f => f.slug !== slug);
    saveTwitterFolders(filtered);

    // Move tweets from deleted folder to no folder
    const articles = getManualArticles();
    let updated = false;
    articles.forEach(a => {
        if (a.source === 'twitter' && a.folder === slug) {
            a.folder = null;
            updated = true;
        }
    });
    if (updated) {
        saveManualArticles(articles);
    }
}

async function saveTwitterFoldersToCloud(folders) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                twitter_folders: folders,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        // Silent fail - cloud sync is best-effort
    } catch (e) {
        // Silent fail - cloud sync is best-effort
    }
}

async function loadTwitterFoldersFromCloud() {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { data, error } = await supabase
            .from('user_settings')
            .select('twitter_folders')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            return;
        }

        if (data?.twitter_folders) {
            localStorage.setItem(TWITTER_FOLDERS_KEY, JSON.stringify(data.twitter_folders));
        }
    } catch (e) {
        // Silent fail - loading from cloud is best-effort
    }
}

function setTweetFolder(tweetUrl, folderSlug) {
    const articles = getManualArticles();
    const article = articles.find(a => a.link === tweetUrl);

    if (article) {
        article.folder = folderSlug;
        saveManualArticles(articles);

        // Update in cloud
        if (isAuthenticated()) {
            updateTweetFolderInCloud(tweetUrl, folderSlug);
        }
    }
}

async function updateTweetFolderInCloud(url, folderSlug) {
    if (!isAuthenticated()) return;

    try {
        const supabase = getSupabaseClient();
        const user = getUser();

        const { error } = await supabase
            .from('manual_articles')
            .update({ folder: folderSlug })
            .eq('user_id', user.id)
            .eq('url', url);

        // Silent fail - cloud sync is best-effort
    } catch (e) {
        // Silent fail - cloud sync is best-effort
    }
}

// Current folder filter (null = all, '' = uncategorized, 'slug' = specific folder)
let currentTwitterFolder = null;

function setTwitterFolderFilter(folderSlug) {
    currentTwitterFolder = folderSlug;
    displayTwitterPosts();
}

/**
 * Delete all Twitter bookmarks
 */
async function deleteAllTwitterBookmarks() {
    const twitterBookmarks = getTwitterBookmarks();

    if (twitterBookmarks.length === 0) {
        alert('No Twitter bookmarks to delete.');
        return;
    }

    if (!confirm(`Are you sure you want to delete all ${twitterBookmarks.length} Twitter bookmarks?`)) {
        return;
    }

    // Get all manual articles and filter out Twitter ones
    const allArticles = getManualArticles();
    const nonTwitterArticles = allArticles.filter(a => a.source !== 'twitter');

    // Save filtered list
    saveManualArticles(nonTwitterArticles);

    // Delete from cloud if authenticated
    if (isAuthenticated()) {
        try {
            const supabase = getSupabaseClient();
            const user = getUser();

            const { error } = await supabase
                .from('manual_articles')
                .delete()
                .eq('user_id', user.id)
                .eq('source', 'twitter');

            // Silent fail - cloud sync is best-effort
        } catch (error) {
            // Silent fail - cloud sync is best-effort
        }
    }

    // Update UI
    updateTwitterFilterCount();
    displayTwitterPosts();
}

// ============================================================
// FOLDER MANAGER MODAL
// ============================================================

function openFolderManager() {
    let modal = document.getElementById('folder-manager-modal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'folder-manager-modal';
        modal.className = 'twitter-import-modal';
        modal.innerHTML = `
            <div class="twitter-import-overlay" onclick="closeFolderManager()"></div>
            <div class="twitter-import-content" style="max-width: 400px;">
                <div class="twitter-import-header">
                    <h2>Manage Folders</h2>
                    <button class="twitter-import-close" onclick="closeFolderManager()">&times;</button>
                </div>
                <div class="folder-manager-body">
                    <div class="folder-add-form">
                        <input type="text" id="new-folder-name" placeholder="New folder name" />
                        <button class="twitter-btn-primary" onclick="createFolder()">Add</button>
                    </div>
                    <div class="folder-list" id="folder-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    renderFolderList();
    modal.classList.add('active');
}

function closeFolderManager() {
    const modal = document.getElementById('folder-manager-modal');
    if (modal) modal.classList.remove('active');
}

function renderFolderList() {
    const list = document.getElementById('folder-list');
    if (!list) return;

    const folders = getTwitterFolders();
    const articles = getManualArticles().filter(a => a.source === 'twitter');

    if (folders.length === 0) {
        list.innerHTML = '<p class="folder-empty">No folders yet. Create one above.</p>';
        return;
    }

    list.innerHTML = folders.map(f => {
        const count = articles.filter(a => a.folder === f.slug).length;
        return `
            <div class="folder-item">
                <span class="folder-name">${escapeHtml(f.name)}</span>
                <span class="folder-count">${count} tweets</span>
                <button class="folder-delete-btn" onclick="confirmDeleteFolder('${f.slug}', '${escapeHtml(f.name)}')" title="Delete folder">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

function createFolder() {
    const input = document.getElementById('new-folder-name');
    const name = input.value.trim();

    if (!name) {
        alert('Please enter a folder name');
        return;
    }

    if (addTwitterFolder(name)) {
        input.value = '';
        renderFolderList();
        displayTwitterPosts(); // Refresh to show new folder
    } else {
        alert('A folder with this name already exists');
    }
}

function confirmDeleteFolder(slug, name) {
    if (confirm(`Delete folder "${name}"? Tweets will be moved to Uncategorized.`)) {
        deleteTwitterFolder(slug);
        renderFolderList();
        displayTwitterPosts();
    }
}

// Initialize Twitter count on page load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure manual articles are loaded
    setTimeout(updateTwitterFilterCount, 500);
    // Load folders from cloud
    if (typeof loadTwitterFoldersFromCloud === 'function') {
        loadTwitterFoldersFromCloud();
    }
});
