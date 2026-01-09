/**
 * Article Reader Modal
 * Kindle-inspired full-screen reading experience
 */

class ArticleReader {
  constructor() {
    this.modal = this.createModal();
    this.currentUrl = null;
    this.cache = this.loadCache();
    this.highlights = this.loadHighlights();
    this.highlightBtn = null;
    document.body.appendChild(this.modal);
    this.addKeyboardShortcuts();
    this.createHighlightButton();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'article-modal';
    modal.innerHTML = `
      <div class="article-modal-overlay"></div>
      <div class="article-modal-content">
        <div class="reading-progress"></div>
        <div class="article-header">
          <button class="close-btn" aria-label="Close article" title="Close (ESC)">×</button>
          <div class="article-meta"></div>
        </div>
        <div class="article-body"></div>
        <div class="article-loading">
          <div class="loading-spinner"></div>
          <p>Loading article...</p>
        </div>
        <div class="article-error" style="display: none;">
          <h2>Could not load article</h2>
          <p class="error-message"></p>
          <div class="error-actions">
            <button class="open-original-btn">Open Original Link</button>
            <button class="close-error-btn">Close</button>
          </div>
        </div>
      </div>
    `;

    // Close handlers
    modal.querySelector('.close-btn').addEventListener('click', () => this.close());
    modal.querySelector('.article-modal-overlay').addEventListener('click', () => this.close());
    modal.querySelector('.close-error-btn')?.addEventListener('click', () => this.close());

    // Progress indicator
    const contentEl = modal.querySelector('.article-modal-content');
    contentEl.addEventListener('scroll', this.updateProgress.bind(this));

    return modal;
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;

      // ESC to close
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  updateProgress(e) {
    const scrolled = e.target.scrollTop;
    const height = e.target.scrollHeight - e.target.clientHeight;
    const percent = height > 0 ? (scrolled / height) * 100 : 0;

    const progressBar = this.modal.querySelector('.reading-progress');
    if (progressBar) {
      progressBar.style.width = percent + '%';
    }
  }

  async open(postUrl, postTitle, blogName) {
    this.currentUrl = postUrl;
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset scroll position
    this.modal.querySelector('.article-modal-content').scrollTop = 0;

    // Hide error, show loading
    this.modal.querySelector('.article-error').style.display = 'none';
    this.modal.querySelector('.article-loading').style.display = 'flex';
    this.modal.querySelector('.article-body').style.display = 'none';

    // Start fetching summary in parallel (don't await yet)
    const summaryPromise = this.fetchSummaryData(postUrl);

    // Check cache first
    const cached = this.getCachedArticle(postUrl);
    if (cached) {
      console.log('Using cached article:', postTitle);
      this.displayArticle(cached, postTitle, blogName, summaryPromise);
      return;
    }

    try {
      // Fetch article content from backend
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(
        `${API_BASE_URL}/api/article?url=${encodeURIComponent(postUrl)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load article');
      }

      const article = await response.json();

      // Cache the article
      this.cacheArticle(postUrl, article);

      // Display article (pass summary promise to handle when ready)
      this.displayArticle(article, postTitle, blogName, summaryPromise);

    } catch (error) {
      console.error('Error loading article:', error);
      this.showError(error.message || 'Could not load article. Please try the original link.');
    }
  }

  async displayArticle(article, postTitle, blogName, summaryPromise) {
    // Hide loading
    this.modal.querySelector('.article-loading').style.display = 'none';

    // Show meta information
    const metaEl = this.modal.querySelector('.article-meta');
    const readTime = article.length ? Math.ceil(article.length / 200) : null;

    metaEl.innerHTML = `
      <span class="blog-badge">${this.escapeHtml(blogName)}</span>
      ${article.byline ? `<span class="author">by ${this.escapeHtml(article.byline)}</span>` : ''}
      ${readTime ? `<span class="read-time">${readTime} min read</span>` : ''}
      ${article.siteName ? `<span class="site-name">${this.escapeHtml(article.siteName)}</span>` : ''}
    `;

    // Show content
    const bodyEl = this.modal.querySelector('.article-body');
    bodyEl.style.display = 'block';

    // Process images for lazy loading
    const processedContent = this.processContent(article.content);

    bodyEl.innerHTML = `
      <article>
        <h1 class="article-title">${this.escapeHtml(article.title || postTitle)}</h1>
        <div class="article-content">${processedContent}</div>
      </article>
      <footer class="article-footer">
        <a href="${this.currentUrl}" target="_blank" rel="noopener noreferrer" class="original-link">
          Read at ${article.siteName || 'source'} →
        </a>
      </footer>
    `;

    // Initialize image lazy loading after content is in DOM
    const articleContent = bodyEl.querySelector('.article-content');
    if (articleContent) {
      this.initImageLazyLoad(articleContent);
      this.initHighlighting(articleContent);
    }

    // Handle summary when ready (was started in parallel during open())
    if (summaryPromise) {
      try {
        const summaryData = await summaryPromise;
        if (summaryData) {
          this.insertSummarySection(summaryData.tldr, summaryData.keyPoints, summaryData.recommendation);
        }
      } catch (error) {
        console.error('Failed to load summary:', error);
      }
    }
  }

  // ============================================================
  // AI SUMMARY FUNCTIONALITY
  // ============================================================

  async fetchSummaryData(articleUrl) {
    // Returns summary data (called in parallel with article fetch)
    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

      // Get user interests if available
      const interests = typeof getUserInterests === 'function' ? getUserInterests() : '';

      let apiUrl = `${API_BASE_URL}/api/summary?url=${encodeURIComponent(articleUrl)}`;
      if (interests) {
        apiUrl += `&interests=${encodeURIComponent(interests)}`;
      }

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.log('Summary not available');
        return null;
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to fetch summary:', error);
      return null;
    }
  }

  insertSummarySection(tldr, keyPoints, recommendation) {
    const articleBody = this.modal.querySelector('.article-body');
    if (!articleBody) return;

    // Remove existing summary if any
    const existing = articleBody.querySelector('.article-summary');
    if (existing) existing.remove();

    // Build recommendation HTML if available
    let recommendationHtml = '';
    if (recommendation && recommendation.score && recommendation.reason) {
      const scoreClass = `recommendation-${recommendation.score}`;
      const scoreLabel = recommendation.score === 'high' ? 'Highly Relevant'
                       : recommendation.score === 'medium' ? 'Somewhat Relevant'
                       : 'Low Relevance';
      recommendationHtml = `
        <div class="summary-recommendation ${scoreClass}">
          <span class="recommendation-score">${scoreLabel}</span>
          <span class="recommendation-reason">${this.escapeHtml(recommendation.reason)}</span>
        </div>
      `;
    }

    // Create summary HTML
    const summaryHtml = `
      <div class="article-summary">
        <div class="summary-header">AI Summary</div>
        ${recommendationHtml}
        <p class="summary-tldr">${this.escapeHtml(tldr)}</p>
        ${keyPoints && keyPoints.length > 0 ? `
          <ul class="summary-key-points">
            ${keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;

    // Insert after article title
    const articleTitle = articleBody.querySelector('.article-title');
    if (articleTitle) {
      articleTitle.insertAdjacentHTML('afterend', summaryHtml);
    }
  }

  processContent(html) {
    // Create temporary div to process HTML
    const div = document.createElement('div');
    div.innerHTML = html;

    // Process images for lazy loading
    div.querySelectorAll('img').forEach(img => {
      img.loading = 'lazy';
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in';

      // Store original src
      const originalSrc = img.src || img.getAttribute('src');
      if (originalSrc) {
        img.dataset.originalSrc = originalSrc;
      }
    });

    // Ensure all links open in new tab
    div.querySelectorAll('a').forEach(link => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });

    return div.innerHTML;
  }

  initImageLazyLoad(container) {
    // After content is in DOM, set up lazy loading
    const images = container.querySelectorAll('img');

    images.forEach(img => {
      const src = img.dataset.originalSrc || img.src;

      if (src) {
        // Simple load handler
        img.onload = () => {
          img.style.opacity = '1';
        };

        // Make sure src is set
        if (!img.src || img.src !== src) {
          img.src = src;
        } else if (img.complete) {
          // Image already loaded
          img.style.opacity = '1';
        }
      }
    });
  }

  showError(message) {
    this.modal.querySelector('.article-loading').style.display = 'none';
    this.modal.querySelector('.article-body').style.display = 'none';

    const errorEl = this.modal.querySelector('.article-error');
    errorEl.style.display = 'flex';
    errorEl.querySelector('.error-message').textContent = message;

    // Open original button
    const openBtn = errorEl.querySelector('.open-original-btn');
    openBtn.onclick = () => {
      window.open(this.currentUrl, '_blank', 'noopener,noreferrer');
    };
  }

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.currentUrl = null;
    this.hideHighlightButton();
  }

  // Cache management
  loadCache() {
    try {
      return JSON.parse(localStorage.getItem('articleCache') || '{}');
    } catch (e) {
      console.error('Error loading article cache:', e);
      return {};
    }
  }

  getCachedArticle(url) {
    const cached = this.cache[url];
    if (!cached) return null;

    // Cache expires after 24 hours
    const age = Date.now() - cached.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      delete this.cache[url];
      this.saveCache();
      return null;
    }

    return cached.article;
  }

  cacheArticle(url, article) {
    this.cache[url] = {
      article,
      timestamp: Date.now()
    };

    // Keep only last 50 articles
    const entries = Object.entries(this.cache);
    if (entries.length > 50) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.cache = Object.fromEntries(entries.slice(0, 50));
    }

    this.saveCache();
  }

  saveCache() {
    try {
      localStorage.setItem('articleCache', JSON.stringify(this.cache));
    } catch (e) {
      console.error('Error saving article cache:', e);
      // If storage is full, clear old cache
      if (e.name === 'QuotaExceededError') {
        this.cache = {};
        localStorage.setItem('articleCache', '{}');
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================
  // HIGHLIGHTING FUNCTIONALITY
  // ============================================================

  createHighlightButton() {
    this.highlightBtn = document.createElement('button');
    this.highlightBtn.className = 'highlight-btn';
    this.highlightBtn.textContent = '✨ Highlight';
    this.highlightBtn.addEventListener('click', () => this.applyHighlight());
    document.body.appendChild(this.highlightBtn);
  }

  initHighlighting(articleBody) {
    // Listen for text selection
    articleBody.addEventListener('mouseup', (e) => {
      setTimeout(() => this.handleTextSelection(e), 10);
    });

    // Hide button when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.highlight-btn') && !e.target.closest('.article-content')) {
        this.hideHighlightButton();
      }
    });

    // Handle clicking on existing highlights to remove them
    articleBody.addEventListener('click', (e) => {
      if (e.target.tagName === 'MARK' || e.target.classList.contains('highlight')) {
        e.preventDefault();
        this.removeHighlight(e.target);
      }
    });

    // Restore saved highlights
    this.restoreHighlights(articleBody);
  }

  handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0 && selectedText.length < 1000) {
      // Valid selection - show button
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      this.highlightBtn.style.left = rect.left + rect.width / 2 - this.highlightBtn.offsetWidth / 2 + 'px';
      this.highlightBtn.style.top = rect.top - 50 + window.scrollY + 'px';
      this.highlightBtn.classList.add('show');
    } else {
      this.hideHighlightButton();
    }
  }

  hideHighlightButton() {
    this.highlightBtn.classList.remove('show');
  }

  applyHighlight() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();

    if (selectedText.length === 0) return;

    // Create highlight element
    const mark = document.createElement('mark');
    mark.textContent = selectedText;
    mark.title = 'Click to remove highlight';

    try {
      range.deleteContents();
      range.insertNode(mark);

      // Save highlight
      this.saveHighlight(selectedText, this.getTextPosition(mark));

      // Clear selection and hide button
      selection.removeAllRanges();
      this.hideHighlightButton();
    } catch (error) {
      console.error('Error applying highlight:', error);
    }
  }

  getTextPosition(element) {
    // Get position of text in article for saving
    const articleContent = this.modal.querySelector('.article-content');
    const textNodes = this.getTextNodes(articleContent);
    let position = 0;
    let found = false;

    for (let node of textNodes) {
      if (node.parentElement === element || node === element.firstChild) {
        found = true;
        break;
      }
      position += node.textContent.length;
    }

    return found ? position : -1;
  }

  getTextNodes(element) {
    const textNodes = [];
    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walk.nextNode()) {
      if (node.textContent.trim().length > 0) {
        textNodes.push(node);
      }
    }
    return textNodes;
  }

  removeHighlight(mark) {
    const text = mark.textContent;
    const position = this.getTextPosition(mark);

    // Replace mark with text
    const textNode = document.createTextNode(text);
    mark.parentNode.replaceChild(textNode, mark);

    // Remove from saved highlights
    this.deleteHighlight(position);
  }

  restoreHighlights(articleBody) {
    const articleHighlights = this.highlights[this.currentUrl] || [];
    // Implementation for restoring highlights would go here
    // For simplicity, we'll skip this for now as it requires more complex text matching
  }

  // Highlight storage
  loadHighlights() {
    try {
      return JSON.parse(localStorage.getItem('articleHighlights') || '{}');
    } catch (e) {
      console.error('Error loading highlights:', e);
      return {};
    }
  }

  // Load highlights from Supabase for current article
  async loadHighlightsFromCloud() {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
      const supabase = getSupabaseClient();
      const user = getUser();

      const { data, error } = await supabase
        .from('highlights')
        .select('article_url, text, position, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading highlights from cloud:', error);
        return;
      }

      // Group by article URL
      const cloudHighlights = {};
      (data || []).forEach(item => {
        if (!cloudHighlights[item.article_url]) {
          cloudHighlights[item.article_url] = [];
        }
        cloudHighlights[item.article_url].push({
          text: item.text,
          position: item.position,
          timestamp: new Date(item.created_at).getTime()
        });
      });

      // Merge with local highlights (cloud wins on conflicts)
      this.highlights = { ...this.highlights, ...cloudHighlights };
      localStorage.setItem('articleHighlights', JSON.stringify(this.highlights));
      console.log('Loaded highlights from cloud:', Object.keys(cloudHighlights).length, 'articles');
    } catch (e) {
      console.error('Failed to load highlights from cloud:', e);
    }
  }

  saveHighlight(text, position) {
    if (!this.highlights[this.currentUrl]) {
      this.highlights[this.currentUrl] = [];
    }

    this.highlights[this.currentUrl].push({
      text,
      position,
      timestamp: Date.now()
    });

    this.saveHighlightsToStorage();

    // Sync to cloud
    this.saveHighlightToCloud(text, position);
  }

  deleteHighlight(position) {
    if (this.highlights[this.currentUrl]) {
      const highlight = this.highlights[this.currentUrl].find(h => h.position === position);
      this.highlights[this.currentUrl] = this.highlights[this.currentUrl].filter(
        h => h.position !== position
      );
      this.saveHighlightsToStorage();

      // Delete from cloud
      if (highlight) {
        this.deleteHighlightFromCloud(highlight.text, position);
      }
    }
  }

  saveHighlightsToStorage() {
    try {
      localStorage.setItem('articleHighlights', JSON.stringify(this.highlights));
    } catch (e) {
      console.error('Error saving highlights:', e);
    }
  }

  // Save single highlight to Supabase
  async saveHighlightToCloud(text, position) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
      const supabase = getSupabaseClient();
      const user = getUser();

      const { error } = await supabase
        .from('highlights')
        .insert({
          user_id: user.id,
          article_url: this.currentUrl,
          text: text,
          position: position
        });

      if (error) {
        console.error('Error saving highlight to cloud:', error);
      }
    } catch (e) {
      console.error('Failed to save highlight to cloud:', e);
    }
  }

  // Delete highlight from Supabase
  async deleteHighlightFromCloud(text, position) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
      const supabase = getSupabaseClient();
      const user = getUser();

      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('user_id', user.id)
        .eq('article_url', this.currentUrl)
        .eq('text', text);

      if (error) {
        console.error('Error deleting highlight from cloud:', error);
      }
    } catch (e) {
      console.error('Failed to delete highlight from cloud:', e);
    }
  }
}

// Initialize global article reader instance
window.articleReader = null;

// Initialize when DOM is ready
function initArticleReader() {
  try {
    window.articleReader = new ArticleReader();
    console.log('ArticleReader initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ArticleReader:', error);
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArticleReader);
} else {
  initArticleReader();
}
