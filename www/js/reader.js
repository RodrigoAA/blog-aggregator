/**
 * Article Reader Modal
 * Kindle-inspired full-screen reading experience
 */

/**
 * Text-to-Speech Controller
 * Uses OpenAI TTS API for natural-sounding narration
 */
class TextToSpeech {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.chunks = [];
    this.currentChunk = 0;
    this.onEnd = null;
    this.onError = null;
    this.voice = 'fable'; // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    this.audioCache = new Map();
    this.isLoading = false;
    this.abortController = null;

    // Audio event handlers
    this.audio.onended = () => {
      this.currentChunk++;
      this.playNextChunk();
    };

    this.audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      this.isPlaying = false;
      this.isLoading = false;
      this.onError?.(e);
    };
  }

  async speak(text) {
    this.cancel();
    this.chunks = this.splitText(text);
    this.currentChunk = 0;
    await this.playNextChunk();
  }

  splitText(text) {
    // OpenAI TTS limit is 4096 chars, use 3800 to be safe
    const maxChars = 3800;
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let current = '';

    for (const p of paragraphs) {
      const trimmedP = p.trim();
      if (!trimmedP) continue;

      if ((current + '\n\n' + trimmedP).length > maxChars) {
        if (current) chunks.push(current.trim());
        // If single paragraph is too long, split by sentences
        if (trimmedP.length > maxChars) {
          const sentences = trimmedP.match(/[^.!?]+[.!?]+/g) || [trimmedP];
          let sentenceChunk = '';
          for (const s of sentences) {
            if ((sentenceChunk + s).length > maxChars) {
              if (sentenceChunk) chunks.push(sentenceChunk.trim());
              sentenceChunk = s;
            } else {
              sentenceChunk += s;
            }
          }
          current = sentenceChunk;
        } else {
          current = trimmedP;
        }
      } else {
        current += (current ? '\n\n' : '') + trimmedP;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  async playNextChunk() {
    if (this.currentChunk >= this.chunks.length) {
      this.isPlaying = false;
      this.isPaused = false;
      this.isLoading = false;
      this.onEnd?.();
      return;
    }

    const text = this.chunks[this.currentChunk];
    if (!text || text.trim().length === 0) {
      this.currentChunk++;
      return this.playNextChunk();
    }

    this.isLoading = true;

    try {
      // Check cache first
      const cacheKey = `${text.substring(0, 100)}_${this.voice}`;
      let audioUrl = this.audioCache.get(cacheKey);

      if (!audioUrl) {
        // Fetch audio from backend
        this.abortController = new AbortController();
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

        const response = await fetch(`${API_BASE_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: this.voice }),
          signal: this.abortController.signal
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'TTS request failed');
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        this.audioCache.set(cacheKey, audioUrl);
      }

      this.audio.src = audioUrl;
      this.audio.playbackRate = this.rate;
      await this.audio.play();

      this.isPlaying = true;
      this.isPaused = false;
      this.isLoading = false;

      // Pre-fetch next chunk in background
      this.prefetchNextChunk();

    } catch (error) {
      this.isLoading = false;
      this.isPlaying = false;
      if (error.name === 'AbortError') {
        return; // Cancelled, ignore
      }
      console.error('TTS error:', error);
      this.onError?.(error);
      throw error; // Re-throw so caller can handle it
    }
  }

  prefetchNextChunk() {
    const nextIndex = this.currentChunk + 1;
    if (nextIndex >= this.chunks.length) return;

    const text = this.chunks[nextIndex];
    if (!text) return;

    const cacheKey = `${text.substring(0, 100)}_${this.voice}`;
    if (this.audioCache.has(cacheKey)) return;

    // Fetch in background
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
    fetch(`${API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: this.voice })
    })
      .then(res => res.blob())
      .then(blob => {
        const audioUrl = URL.createObjectURL(blob);
        this.audioCache.set(cacheKey, audioUrl);
      })
      .catch(() => {}); // Ignore prefetch errors
  }

  pause() {
    this.audio.pause();
    this.isPaused = true;
    this.isPlaying = false;
  }

  resume() {
    this.audio.play();
    this.isPaused = false;
    this.isPlaying = true;
  }

  cancel() {
    this.abortController?.abort();
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.isLoading = false;
    this.currentChunk = 0;
  }

  setRate(rate) {
    this.rate = rate;
    this.audio.playbackRate = rate;
  }

  isSupported() {
    return true; // OpenAI TTS works everywhere
  }
}

class ArticleReader {
  constructor() {
    this.modal = this.createModal();
    this.currentUrl = null;
    this.cache = this.loadCache();
    this.highlights = this.loadHighlights();
    this.highlightBtn = null;
    this.ttsText = '';
    document.body.appendChild(this.modal);
    this.addKeyboardShortcuts();
    this.createHighlightButton();
    this.initTTS();
  }

  initTTS() {
    this.tts = new TextToSpeech();
    this.tts.onEnd = () => this.updateTTSButton('stopped');
    this.tts.onError = () => this.updateTTSButton('stopped');

    // Hide TTS controls if not supported
    if (!this.tts.isSupported()) {
      const ttsControls = this.modal.querySelector('.tts-controls');
      if (ttsControls) ttsControls.classList.add('unsupported');
    }
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
          <div class="tts-controls">
            <button class="tts-btn" aria-label="Escuchar articulo" title="Escuchar articulo">
              <svg class="tts-icon-play" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
              </svg>
              <svg class="tts-icon-pause" width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:none">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
              </svg>
            </button>
            <div class="tts-speed-menu">
              <button data-rate="0.75">0.75x</button>
              <button data-rate="1" class="active">1x</button>
              <button data-rate="1.25">1.25x</button>
              <button data-rate="1.5">1.5x</button>
              <button data-rate="2">2x</button>
            </div>
          </div>
          <button class="save-article-btn" aria-label="Save article" title="Favorito">★ Favorite</button>
        </div>
        <div class="article-body"></div>
        <div class="article-loading">
          <div class="loading-spinner"></div>
          <p class="loading-text">Cargando articulo...</p>
        </div>
        <div class="article-error" style="display: none;">
          <h2>No se pudo cargar el articulo</h2>
          <p class="error-message"></p>
          <div class="error-actions">
            <button class="retry-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Reintentar
            </button>
            <button class="open-original-btn">Abrir Original</button>
          </div>
        </div>
      </div>
    `;

    // Close handlers
    modal.querySelector('.close-btn').addEventListener('click', () => this.close());
    modal.querySelector('.article-modal-overlay').addEventListener('click', () => this.close());
    modal.querySelector('.close-error-btn')?.addEventListener('click', () => this.close());

    // Save button handler
    modal.querySelector('.save-article-btn').addEventListener('click', () => this.toggleSave());

    // TTS button handler
    const ttsBtn = modal.querySelector('.tts-btn');
    ttsBtn.addEventListener('click', () => this.toggleTTS());

    // TTS speed menu toggle (long press or second click while playing)
    const ttsControls = modal.querySelector('.tts-controls');
    const speedMenu = modal.querySelector('.tts-speed-menu');

    ttsBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      speedMenu.classList.toggle('show');
    });

    // Speed button handlers
    speedMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rate = parseFloat(btn.dataset.rate);
        this.setTTSRate(rate);
        speedMenu.classList.remove('show');
      });
    });

    // Close speed menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!ttsControls.contains(e.target)) {
        speedMenu.classList.remove('show');
      }
    });

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

  // ============================================================
  // TEXT-TO-SPEECH CONTROLS
  // ============================================================

  async toggleTTS() {
    if (!this.tts.isSupported()) {
      return;
    }

    // Prevent double-clicks while loading
    if (this.tts.isLoading) {
      return;
    }

    if (this.tts.isPlaying) {
      this.tts.pause();
      this.updateTTSButton('paused');
    } else if (this.tts.isPaused) {
      this.tts.resume();
      this.updateTTSButton('playing');
    } else {
      if (this.ttsText) {
        this.updateTTSButton('loading');
        try {
          await this.tts.speak(this.ttsText);
          if (this.tts.isPlaying) {
            this.updateTTSButton('playing');
          } else {
            // Audio failed to play
            this.updateTTSButton('stopped');
          }
        } catch (error) {
          console.error('TTS failed:', error);
          this.updateTTSButton('stopped');
        }
      }
    }
  }

  updateTTSButton(state) {
    const btn = this.modal.querySelector('.tts-btn');
    if (!btn) return;

    const playIcon = btn.querySelector('.tts-icon-play');
    const pauseIcon = btn.querySelector('.tts-icon-pause');

    btn.classList.remove('playing', 'paused', 'loading');

    if (state === 'loading') {
      btn.classList.add('loading');
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'none';
      btn.title = 'Cargando audio...';
    } else if (state === 'playing') {
      btn.classList.add('playing');
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      btn.title = 'Pausar';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      if (state === 'paused') {
        btn.classList.add('paused');
        btn.title = 'Continuar';
      } else {
        btn.title = 'Escuchar articulo';
      }
    }
  }

  setTTSRate(rate) {
    this.tts.setRate(rate);
    // Update active button in speed menu
    this.modal.querySelectorAll('.tts-speed-menu button').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.rate) === rate);
    });
  }

  async open(postUrl, postTitle, blogName) {
    this.currentUrl = postUrl;
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset TTS state for new article
    this.tts?.cancel();
    this.ttsText = '';
    this.updateTTSButton('stopped');

    // Reset scroll position
    this.modal.querySelector('.article-modal-content').scrollTop = 0;

    // Clear previous article data from header
    this.modal.querySelector('.article-meta').innerHTML = '';

    // Hide error, show loading
    this.modal.querySelector('.article-error').style.display = 'none';
    this.modal.querySelector('.article-loading').style.display = 'flex';
    this.modal.querySelector('.article-body').style.display = 'none';

    // Start fetching summary in parallel
    const summaryPromise = this.fetchSummaryData(postUrl);

    // Get article (from cache or fetch)
    let article;
    const cached = this.getCachedArticle(postUrl);

    if (cached) {
      article = cached;
    } else {
      try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(
          `${API_BASE_URL}/api/article?url=${encodeURIComponent(postUrl)}`
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to load article');
        }

        article = await response.json();
        this.cacheArticle(postUrl, article);

      } catch (error) {
        console.error('Error loading article:', error);
        this.showError(error.message || 'Could not load article. Please try the original link.');
        return;
      }
    }

    // Wait for summary to complete
    let summaryData = null;
    try {
      summaryData = await summaryPromise;
    } catch (error) {
      console.error('Summary generation failed:', error);
      // Continue without summary - article is still shown
    }

    // Now display everything together
    this.displayArticle(article, postTitle, blogName, summaryData);
  }

  displayArticle(article, postTitle, blogName, summaryData) {
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

    // Insert summary if available (already loaded)
    if (summaryData) {
      this.insertSummarySection(summaryData.tldr, summaryData.keyPoints, summaryData.recommendation);
    }

    // Prepare text for TTS
    const titleEl = bodyEl.querySelector('.article-title');
    const contentEl = bodyEl.querySelector('.article-content');
    if (titleEl && contentEl) {
      this.ttsText = titleEl.innerText + '\n\n' + contentEl.innerText;
    }

    // Update save button state
    this.updateSaveButton();
  }

  // ============================================================
  // AI SUMMARY FUNCTIONALITY
  // ============================================================

  async fetchSummaryData(articleUrl) {
    // Check cloud cache first (if authenticated)
    const cloudCached = await this.getCachedSummaryFromCloud(articleUrl);
    if (cloudCached) {
      // Also cache locally for offline access
      this.cacheSummaryLocally(articleUrl, cloudCached);
      return cloudCached;
    }

    // Check local cache
    const cached = this.getCachedSummary(articleUrl);
    if (cached) {
      return cached;
    }

    // Fetch from API
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
        return null;
      }

      const data = await response.json();

      // Cache the summary locally and in cloud
      this.cacheSummary(articleUrl, data);

      return data;

    } catch (error) {
      console.error('Failed to fetch summary:', error);
      return null;
    }
  }

  // Summary cache management - Local
  getCachedSummary(url) {
    try {
      const cache = JSON.parse(localStorage.getItem('summaryCache') || '{}');
      const cached = cache[url];
      if (!cached) return null;

      // Cache expires after 30 days
      const age = Date.now() - cached.timestamp;
      if (age > 30 * 24 * 60 * 60 * 1000) {
        delete cache[url];
        localStorage.setItem('summaryCache', JSON.stringify(cache));
        return null;
      }

      return cached.data;
    } catch (e) {
      console.error('Error reading summary cache:', e);
      return null;
    }
  }

  cacheSummaryLocally(url, data) {
    try {
      let cache = JSON.parse(localStorage.getItem('summaryCache') || '{}');

      cache[url] = {
        data,
        timestamp: Date.now()
      };

      // Keep only last 100 summaries
      const entries = Object.entries(cache);
      if (entries.length > 100) {
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        cache = Object.fromEntries(entries.slice(0, 100));
      }

      localStorage.setItem('summaryCache', JSON.stringify(cache));
    } catch (e) {
      console.error('Error saving summary cache:', e);
    }
  }

  cacheSummary(url, data) {
    // Save locally
    this.cacheSummaryLocally(url, data);

    // Save to cloud if authenticated
    this.cacheSummaryToCloud(url, data);
  }

  // Summary cache management - Cloud (Supabase)
  async getCachedSummaryFromCloud(url) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
      return null;
    }

    try {
      const supabase = getSupabaseClient();
      const user = getUser();

      const { data, error } = await supabase
        .from('summaries')
        .select('tldr, key_points, recommendation_score, recommendation_reason')
        .eq('user_id', user.id)
        .eq('article_url', url)
        .single();

      if (error || !data) {
        return null;
      }

      // Reconstruct summary object
      return {
        tldr: data.tldr,
        keyPoints: data.key_points,
        recommendation: data.recommendation_score ? {
          score: data.recommendation_score,
          reason: data.recommendation_reason
        } : null
      };

    } catch (e) {
      console.error('Error reading summary from cloud:', e);
      return null;
    }
  }

  async cacheSummaryToCloud(url, data) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const user = getUser();

      const { error } = await supabase
        .from('summaries')
        .upsert({
          user_id: user.id,
          article_url: url,
          tldr: data.tldr,
          key_points: data.keyPoints,
          recommendation_score: data.recommendation?.score || null,
          recommendation_reason: data.recommendation?.reason || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,article_url'
        });

      if (error) {
        console.error('Error saving summary to cloud:', error);
      }
    } catch (e) {
      console.error('Failed to save summary to cloud:', e);
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
          <div class="recommendation-title">Reading Recommendation</div>
          <span class="recommendation-score">${scoreLabel}</span>
          <span class="recommendation-reason">${this.escapeHtml(recommendation.reason)}</span>
        </div>
      `;
    } else {
      // No recommendation - prompt user to set interests
      recommendationHtml = `
        <div class="summary-recommendation recommendation-none">
          <div class="recommendation-title">Reading Recommendation</div>
          <span class="recommendation-hint">Define your interests in <a href="#" onclick="openBlogManagement(); return false;">Settings</a> to get personalized recommendations</span>
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

    // Retry button
    const retryBtn = errorEl.querySelector('.retry-btn');
    retryBtn.onclick = async () => {
      retryBtn.classList.add('loading');
      errorEl.style.display = 'none';
      this.modal.querySelector('.article-loading').style.display = 'flex';

      // Re-attempt to load the article
      try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(
          `${API_BASE_URL}/api/article?url=${encodeURIComponent(this.currentUrl)}`
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to load article');
        }

        const article = await response.json();
        this.cacheArticle(this.currentUrl, article);

        // Try to get summary
        let summaryData = null;
        try {
          summaryData = await this.fetchSummaryData(this.currentUrl);
        } catch (e) {
          // Continue without summary
        }

        this.displayArticle(article, article.title, article.siteName || '', summaryData);
      } catch (error) {
        retryBtn.classList.remove('loading');
        this.showError(error.message || 'No se pudo cargar el articulo.');
      }
    };

    // Open original button
    const openBtn = errorEl.querySelector('.open-original-btn');
    openBtn.onclick = () => {
      window.open(this.currentUrl, '_blank', 'noopener,noreferrer');
    };
  }

  close() {
    // Stop TTS when closing
    this.tts?.cancel();
    this.updateTTSButton('stopped');

    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.currentUrl = null;
    this.hideHighlightButton();

    // Emit event for Tinder Mode to restore itself
    this.modal.dispatchEvent(new CustomEvent('articleReaderClosed'));
  }

  // Toggle favorite status
  toggleSave() {
    if (!this.currentUrl) return;

    const currentStatus = typeof getPostStatus === 'function' ? getPostStatus(this.currentUrl) : 'inbox';
    const isFavorite = currentStatus === 'favorite';

    if (isFavorite) {
      // Remove from favorites - move to cleared
      if (typeof markAsCleared === 'function') {
        markAsCleared(this.currentUrl);
      }
    } else {
      // Add to favorites
      if (typeof markAsFavorite === 'function') {
        markAsFavorite(this.currentUrl);
      }
    }

    // Update button state
    this.updateSaveButton();

    // Refresh the post list if visible
    if (typeof displayPosts === 'function' && typeof allPosts !== 'undefined') {
      displayPosts(allPosts);
    }
  }

  updateSaveButton() {
    const saveBtn = this.modal.querySelector('.save-article-btn');
    if (!saveBtn || !this.currentUrl) return;

    const currentStatus = typeof getPostStatus === 'function' ? getPostStatus(this.currentUrl) : 'inbox';
    const isFavorite = currentStatus === 'favorite';

    if (isFavorite) {
      saveBtn.textContent = '★ Favorite';
      saveBtn.classList.add('saved');
    } else {
      saveBtn.textContent = '☆ Favorite';
      saveBtn.classList.remove('saved');
    }
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

  // escapeHtml() - uses global function from utils.js
  escapeHtml(text) {
    return escapeHtml(text);
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
    // Listen for text selection - desktop
    articleBody.addEventListener('mouseup', (e) => {
      setTimeout(() => this.handleTextSelection(e), 10);
    });

    // Listen for text selection - mobile (touchend + selectionchange)
    articleBody.addEventListener('touchend', (e) => {
      // Delay to let selection finalize on mobile
      setTimeout(() => this.handleTextSelection(e), 300);
    });

    // Also listen to selectionchange for better mobile support
    document.addEventListener('selectionchange', () => {
      // Only handle if modal is open and selection is within article
      if (this.modal.classList.contains('active')) {
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (articleBody.contains(range.commonAncestorContainer)) {
              this.handleTextSelection(null);
            }
          }
        }, 100);
      }
    });

    // Hide button when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.highlight-btn') && !e.target.closest('.article-content')) {
        this.hideHighlightButton();
      }
    });

    // Hide button on touch outside - mobile
    document.addEventListener('touchstart', (e) => {
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

      // Position button BELOW selection to avoid native mobile context menu
      const buttonWidth = this.highlightBtn.offsetWidth || 100;
      const buttonHeight = 40;
      let left = rect.left + rect.width / 2 - buttonWidth / 2;
      let top = rect.bottom + 10; // Below selection with small gap

      // Keep button within viewport bounds
      const padding = 10;
      left = Math.max(padding, Math.min(left, window.innerWidth - buttonWidth - padding));

      // If button would go off bottom of screen, try above selection
      if (top + buttonHeight > window.innerHeight - padding) {
        top = rect.top - buttonHeight - 10;
      }

      this.highlightBtn.style.left = left + 'px';
      this.highlightBtn.style.top = top + 'px';
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
  async deleteHighlightFromCloud(text, position, articleUrl = null) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
      const supabase = getSupabaseClient();
      const user = getUser();

      // Use provided articleUrl or fall back to currentUrl
      const url = articleUrl || this.currentUrl;
      if (!url) {
        console.error('No article URL for highlight deletion');
        return;
      }

      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('user_id', user.id)
        .eq('article_url', url)
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
