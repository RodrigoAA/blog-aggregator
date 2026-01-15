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
     */
    normalizeBookmark(rawBookmark) {
        // Handle different field names from various exporters
        const tweetUrl = this.normalizeUrl(
            rawBookmark.link || rawBookmark.url || rawBookmark.tweetUrl || ''
        );

        return {
            url: tweetUrl,
            title: this.extractTweetTitle(rawBookmark),
            description: rawBookmark.tweetText || rawBookmark.text || rawBookmark.content || '',
            date: new Date(rawBookmark.time || rawBookmark.createdAt || rawBookmark.timestamp || Date.now()),
            siteName: 'Twitter',
            source: 'twitter',
            authorName: rawBookmark.authorName || rawBookmark.author || rawBookmark.name || '',
            authorHandle: rawBookmark.handle || rawBookmark.screenName || rawBookmark.username || '',
            engagementData: {
                retweets: parseInt(rawBookmark.retweets || rawBookmark.retweetCount || 0) || 0,
                likes: parseInt(rawBookmark.likes || rawBookmark.likeCount || rawBookmark.favoriteCount || 0) || 0,
                replies: parseInt(rawBookmark.replies || rawBookmark.replyCount || 0) || 0
            }
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
        const text = bookmark.tweetText || bookmark.text || bookmark.content || '';
        const authorName = bookmark.authorName || bookmark.author || bookmark.name || 'Unknown';

        if (!text) {
            return `Tweet by ${authorName}`;
        }

        // Use first sentence or truncate
        const firstSentence = text.split(/[.!?]\s/)[0];
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
                    engagementData: bookmark.engagementData
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
        console.log('Twitter bookmark already exists:', article.link);
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
            engagement_data: article.engagementData || null,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('manual_articles')
            .upsert(articleData, { onConflict: 'user_id,url' });

        if (error) {
            console.error('Error saving Twitter bookmark to cloud:', error);
        } else {
            console.log('Twitter bookmark saved to cloud');
        }
    } catch (error) {
        console.error('Failed to save Twitter bookmark to cloud:', error);
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
            console.error('Error parsing file:', error);
            alert('Failed to parse file: ' + error.message);
        }
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
        console.error('Import error:', error);
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

// Initialize Twitter count on page load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure manual articles are loaded
    setTimeout(updateTwitterFilterCount, 500);
});
