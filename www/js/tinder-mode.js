/**
 * Tinder Mode - Swipe-based post triage for mobile
 * Only active on screens < 768px when viewing Inbox
 */

class TinderMode {
    constructor() {
        this.isActive = false;
        this.posts = [];
        this.currentIndex = 0;
        this.container = null;
        this.threshold = 100; // px to confirm swipe
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.hasMoved = false;
        this.init();
    }

    init() {
        this.createContainer();
        this.setupMediaQueryListener();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'tinder-mode-container';
        this.container.className = 'tinder-mode-container';
        this.container.innerHTML = `
            <div class="tinder-mode-header">
                <button class="tinder-close-btn" aria-label="Cerrar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <span class="tinder-counter">0 / 0</span>
                <span class="tinder-title">Inbox</span>
            </div>
            <div class="tinder-cards-stack"></div>
            <div class="tinder-empty-state">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h2>No hay mas posts</h2>
                <p>Has revisado todos los posts del Inbox. Vuelve mas tarde para ver nuevos articulos.</p>
                <button class="tinder-exit-btn">Volver</button>
            </div>
            <div class="tinder-indicators">
                <div class="tinder-indicator tinder-indicator-left">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>Descartar</span>
                </div>
                <div class="tinder-indicator tinder-indicator-right">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Leer después</span>
                </div>
            </div>
            <div class="tinder-action-buttons">
                <button class="tinder-action-btn tinder-skip-btn" aria-label="Descartar">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <button class="tinder-action-btn tinder-save-btn" aria-label="Guardar para despues">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </button>
            </div>
        `;
        this.container.style.display = 'none';
        document.body.appendChild(this.container);

        // Bind button events
        this.container.querySelector('.tinder-close-btn').addEventListener('click', () => this.deactivate());
        this.container.querySelector('.tinder-exit-btn').addEventListener('click', () => this.deactivate());
        this.container.querySelector('.tinder-skip-btn').addEventListener('click', () => this.swipeLeft());
        this.container.querySelector('.tinder-save-btn').addEventListener('click', () => this.swipeRight());
    }

    setupMediaQueryListener() {
        this.mediaQuery = window.matchMedia('(max-width: 768px)');
        this.mediaQuery.addEventListener('change', (e) => {
            if (!e.matches && this.isActive) {
                this.deactivate();
            }
        });
    }

    canActivate() {
        return this.mediaQuery.matches && typeof currentFilter !== 'undefined' && currentFilter === POST_STATUS.INBOX;
    }

    activate() {
        if (!this.canActivate()) return;

        // Get inbox posts
        this.posts = filterPostsByStatus(allPosts, POST_STATUS.INBOX);

        if (this.posts.length === 0) {
            return;
        }

        this.currentIndex = 0;
        this.isActive = true;
        this.container.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        this.renderCards();
        this.updateCounter();
        this.showEmptyState(false);
    }

    deactivate() {
        this.isActive = false;
        this.container.style.display = 'none';
        document.body.style.overflow = '';

        // Refresh the normal post list
        if (typeof displayPosts === 'function') {
            displayPosts(allPosts);
        }
    }

    showEmptyState(show) {
        const stack = this.container.querySelector('.tinder-cards-stack');
        const emptyState = this.container.querySelector('.tinder-empty-state');
        const actionButtons = this.container.querySelector('.tinder-action-buttons');

        if (show) {
            stack.style.display = 'none';
            emptyState.style.display = 'flex';
            actionButtons.style.display = 'none';
        } else {
            stack.style.display = 'flex';
            emptyState.style.display = 'none';
            actionButtons.style.display = 'flex';
        }
    }

    renderCards() {
        const stack = this.container.querySelector('.tinder-cards-stack');

        // Check if we have posts remaining
        if (this.currentIndex >= this.posts.length) {
            stack.innerHTML = '';
            this.showEmptyState(true);
            return;
        }

        const currentPost = this.posts[this.currentIndex];
        const nextPost = this.posts[this.currentIndex + 1];

        stack.innerHTML = '';

        // Add next card first (behind)
        if (nextPost) {
            stack.innerHTML += this.createCardHTML(nextPost, 'tinder-card-next');
        }

        // Add current card (on top)
        stack.innerHTML += this.createCardHTML(currentPost, 'tinder-card-current');

        // Bind touch/pointer events to current card
        const currentCard = stack.querySelector('.tinder-card-current');
        if (currentCard) {
            this.bindCardEvents(currentCard);
            // Load AI summary for current card
            this.loadSummaryForCard(currentCard, currentPost.link);
        }
    }

    createCardHTML(post, extraClass = '') {
        // Uses global escapeHtml() from utils.js
        const formattedDate = typeof formatDate === 'function' ? formatDate(post.date) : '';

        return `
            <article class="tinder-card ${extraClass} tinder-card-loading" data-url="${escapeHtml(post.link)}">
                <div class="tinder-card-loader">
                    <span class="tinder-loading-atom">
                        <span class="atom-orbit atom-orbit-1"></span>
                        <span class="atom-orbit atom-orbit-2"></span>
                        <span class="atom-orbit atom-orbit-3"></span>
                        <span class="atom-nucleus"></span>
                        <span class="atom-particle atom-particle-1"></span>
                        <span class="atom-particle atom-particle-2"></span>
                        <span class="atom-particle atom-particle-3"></span>
                    </span>
                    <span class="tinder-loading-text">Analizando siguiente articulo</span>
                </div>
                <div class="tinder-card-content">
                    <div class="tinder-card-header">
                        <span class="tinder-card-source">${escapeHtml(post.blogName)}</span>
                        <span class="tinder-card-readtime"></span>
                    </div>
                    <h2 class="tinder-card-title">${escapeHtml(post.title)}</h2>
                    <div class="tinder-card-tldr">
                        <span class="tinder-tldr-label">TL;DR</span>
                        <p class="tinder-tldr-text"></p>
                    </div>
                    <div class="tinder-card-footer">
                        <span class="tinder-card-date">${formattedDate}</span>
                        <div class="tinder-flames" data-score="">
                            <span class="tinder-flame">🔥</span>
                            <span class="tinder-flame">🔥</span>
                            <span class="tinder-flame">🔥</span>
                        </div>
                    </div>
                </div>
                <div class="tinder-card-overlay tinder-overlay-left">
                    <span>DESCARTAR</span>
                </div>
                <div class="tinder-card-overlay tinder-overlay-right">
                    <span>LEER DESPUES</span>
                </div>
            </article>
        `;
    }

    async loadSummaryForCard(card, postUrl) {
        const tldrElement = card.querySelector('.tinder-tldr-text');
        const flamesElement = card.querySelector('.tinder-flames');
        const readtimeElement = card.querySelector('.tinder-card-readtime');
        if (!tldrElement) return;

        const showContent = () => {
            card.classList.remove('tinder-card-loading');
        };

        try {
            // Check local cache first (uses global function from utils.js)
            const cached = getCachedSummary(postUrl);
            if (cached?.tldr) {
                tldrElement.textContent = cached.tldr;
                showContent();
                this.updateFlames(flamesElement, cached.recommendation?.score);
                this.updateReadingTime(readtimeElement, cached.readingTime);
                return;
            }

            // Fetch from API (uses global function from utils.js)
            const interests = typeof getUserInterests === 'function' ? getUserInterests() : '';
            const data = await fetchSummary(postUrl, interests);

            if (!data || !data.tldr) {
                tldrElement.textContent = 'Resumen no disponible';
                tldrElement.classList.add('tinder-tldr-unavailable');
                showContent();
                this.updateFlames(flamesElement, null);
                return;
            }

            tldrElement.textContent = data.tldr;
            showContent();
            // Cache locally (uses global function from utils.js)
            cacheSummaryLocally(postUrl, data);

            // Update flames based on recommendation
            this.updateFlames(flamesElement, data.recommendation?.score);
            // Update reading time
            this.updateReadingTime(readtimeElement, data.readingTime);
        } catch (error) {
            console.error('Failed to load summary:', error);
            tldrElement.textContent = 'Error al cargar resumen';
            tldrElement.classList.add('tinder-tldr-unavailable');
            showContent();
            this.updateFlames(flamesElement, null);
        }
    }

    updateFlames(flamesElement, score) {
        if (!flamesElement) return;

        // Map score to number of flames: high=3, medium=2, low=1, null=0
        const flameCount = score === 'high' ? 3 : score === 'medium' ? 2 : score === 'low' ? 1 : 0;
        flamesElement.setAttribute('data-score', score || 'none');

        const flames = flamesElement.querySelectorAll('.tinder-flame');
        flames.forEach((flame, index) => {
            if (index < flameCount) {
                flame.classList.add('active');
            } else {
                flame.classList.remove('active');
            }
        });
    }

    updateReadingTime(element, minutes) {
        if (!element) return;
        if (minutes) {
            element.textContent = `${minutes} min`;
        }
    }

    // getCachedSummary() and cacheSummaryLocally() moved to utils.js

    bindCardEvents(card) {
        card.addEventListener('pointerdown', (e) => this.onDragStart(e, card));
        card.addEventListener('pointermove', (e) => this.onDragMove(e, card));
        card.addEventListener('pointerup', (e) => this.onDragEnd(e, card));
        card.addEventListener('pointercancel', (e) => this.onDragEnd(e, card));
    }

    onDragStart(e, card) {
        this.isDragging = true;
        this.hasMoved = false;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.currentX = 0;

        card.setPointerCapture(e.pointerId);
        card.style.transition = 'none';
    }

    onDragMove(e, card) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        // Mark as moved if significant movement
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            this.hasMoved = true;
        }

        // Only allow horizontal movement
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();
        }

        this.currentX = deltaX;

        // Apply transform
        const rotation = deltaX * 0.08;
        card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

        // Show overlays based on direction
        const overlayLeft = card.querySelector('.tinder-overlay-left');
        const overlayRight = card.querySelector('.tinder-overlay-right');
        const progress = Math.min(Math.abs(deltaX) / this.threshold, 1);

        if (deltaX < 0) {
            overlayLeft.style.opacity = progress;
            overlayRight.style.opacity = 0;
            this.updateIndicator('left', progress);
        } else if (deltaX > 0) {
            overlayRight.style.opacity = progress;
            overlayLeft.style.opacity = 0;
            this.updateIndicator('right', progress);
        } else {
            overlayLeft.style.opacity = 0;
            overlayRight.style.opacity = 0;
            this.updateIndicator('none', 0);
        }
    }

    onDragEnd(e, card) {
        if (!this.isDragging) return;
        this.isDragging = false;

        card.releasePointerCapture(e.pointerId);

        // Reset indicators
        this.updateIndicator('none', 0);

        // Check if swipe threshold reached
        if (this.currentX < -this.threshold) {
            this.completeSwipe(card, 'left');
        } else if (this.currentX > this.threshold) {
            this.completeSwipe(card, 'right');
        } else {
            // Snap back or handle tap
            card.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.transform = '';
            card.querySelector('.tinder-overlay-left').style.opacity = 0;
            card.querySelector('.tinder-overlay-right').style.opacity = 0;

            // Handle tap (no significant movement)
            if (!this.hasMoved) {
                this.openArticle(card.dataset.url);
            }
        }

        this.currentX = 0;
    }

    updateIndicator(direction, progress) {
        const leftIndicator = this.container.querySelector('.tinder-indicator-left');
        const rightIndicator = this.container.querySelector('.tinder-indicator-right');

        if (direction === 'left') {
            leftIndicator.style.opacity = progress;
            leftIndicator.style.transform = `scale(${1 + progress * 0.2})`;
            rightIndicator.style.opacity = 0;
            rightIndicator.style.transform = '';
        } else if (direction === 'right') {
            rightIndicator.style.opacity = progress;
            rightIndicator.style.transform = `scale(${1 + progress * 0.2})`;
            leftIndicator.style.opacity = 0;
            leftIndicator.style.transform = '';
        } else {
            leftIndicator.style.opacity = 0;
            rightIndicator.style.opacity = 0;
            leftIndicator.style.transform = '';
            rightIndicator.style.transform = '';
        }
    }

    completeSwipe(card, direction) {
        const postUrl = card.dataset.url;

        // Animate card off screen
        const targetX = direction === 'left' ? -window.innerWidth * 1.5 : window.innerWidth * 1.5;
        const rotation = direction === 'left' ? -30 : 30;

        card.style.transition = 'transform 0.4s cubic-bezier(0.5, 0, 0.5, 1)';
        card.style.transform = `translateX(${targetX}px) rotate(${rotation}deg)`;

        // Update post status
        if (direction === 'left') {
            if (typeof markAsCleared === 'function') {
                markAsCleared(postUrl);
            }
        } else {
            if (typeof markAsPending === 'function') {
                markAsPending(postUrl);
            }
        }

        // Move to next card after animation
        setTimeout(() => {
            this.currentIndex++;
            this.renderCards();
            this.updateCounter();
            this.updateInboxBadge();
        }, 300);
    }

    swipeLeft() {
        const card = this.container.querySelector('.tinder-card-current');
        if (card) {
            this.completeSwipe(card, 'left');
        }
    }

    swipeRight() {
        const card = this.container.querySelector('.tinder-card-current');
        if (card) {
            this.completeSwipe(card, 'right');
        }
    }

    openArticle(url) {
        const post = this.posts.find(p => p.link === url);
        if (post && window.articleReader) {
            // Hide Tinder Mode so reader is visible
            this.container.style.display = 'none';

            // Listen for reader close to show Tinder Mode again
            const readerModal = document.getElementById('article-modal');
            if (readerModal) {
                const restoreTinderMode = () => {
                    this.container.style.display = 'flex';
                };

                // Listen to close button, overlay click, and ESC key
                const closeBtn = readerModal.querySelector('.close-btn');
                const overlay = readerModal.querySelector('.article-modal-overlay');

                const onClose = () => {
                    restoreTinderMode();
                    // Remove listeners
                    closeBtn?.removeEventListener('click', onClose);
                    overlay?.removeEventListener('click', onClose);
                    document.removeEventListener('keydown', onEsc);
                };

                const onEsc = (e) => {
                    if (e.key === 'Escape') {
                        onClose();
                    }
                };

                closeBtn?.addEventListener('click', onClose);
                overlay?.addEventListener('click', onClose);
                document.addEventListener('keydown', onEsc);
            }

            window.articleReader.open(url, post.title, post.blogName);
        }
    }

    updateCounter() {
        const counter = this.container.querySelector('.tinder-counter');
        const remaining = this.posts.length - this.currentIndex;
        counter.textContent = `${Math.min(this.currentIndex + 1, this.posts.length)} / ${this.posts.length}`;
    }

    updateInboxBadge() {
        const inboxBtn = document.querySelector('[data-filter="inbox"]');
        if (inboxBtn) {
            const badge = inboxBtn.querySelector('.count-badge');
            if (badge && typeof getStatusCounts === 'function') {
                const counts = getStatusCounts(allPosts);
                badge.textContent = counts.inbox;
            }
        }
    }

}

// Global instance
window.tinderMode = null;

// Initialize when DOM is ready
function initTinderMode() {
    window.tinderMode = new TinderMode();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTinderMode);
} else {
    initTinderMode();
}
