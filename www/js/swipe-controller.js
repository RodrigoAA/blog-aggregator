/**
 * SwipeController - Main swipe interface controller
 * Promoted from Tinder Mode to be the primary UI
 */

class SwipeController {
    constructor() {
        this.currentDeck = 'inbox';
        this.posts = [];
        this.currentIndex = 0;
        this.threshold = 100;
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.hasMoved = false;

        this.mainContent = document.getElementById('main-content');
        this.cardsStack = document.getElementById('swipe-cards-stack');
        this.emptyState = document.getElementById('swipe-empty-state');

        this.swipeDecks = ['inbox', 'saved'];
        this.listDecks = ['favorites', 'twitter', 'highlights'];

        this.init();
    }

    init() {
        this.switchDeck('inbox');
    }

    switchDeck(deckName) {
        this.currentDeck = deckName;
        this.currentIndex = 0;

        document.querySelectorAll('.deck-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.deck === deckName);
        });

        this.mainContent.dataset.deck = deckName;

        if (this.listDecks.includes(deckName)) {
            this.showListView();
            this.loadListData(deckName);
        } else {
            this.showSwipeView();
            this.loadSwipeData(deckName);
        }

        this.updateDeckCounts();
    }

    showSwipeView() {
        this.mainContent.classList.remove('list-mode');
        this.mainContent.classList.add('swipe-mode');
    }

    showListView() {
        this.mainContent.classList.remove('swipe-mode');
        this.mainContent.classList.add('list-mode');
    }

    loadSwipeData(deckName) {
        // Check authentication
        if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
            this.posts = [];
            this.showSignInState();
            return;
        }

        if (typeof allPosts === 'undefined' || typeof filterPostsByStatus === 'undefined') {
            this.posts = [];
            this.showEmptyState();
            return;
        }

        // Check if allPosts is populated
        if (!allPosts || allPosts.length === 0) {
            this.posts = [];
            this.showLoadingState();
            return;
        }

        let status = deckName === 'inbox' ? POST_STATUS.INBOX : POST_STATUS.PENDING;
        this.posts = filterPostsByStatus(allPosts, status);
        this.currentIndex = 0;

        if (this.posts.length === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
            this.renderCards();
            this.updateCounter();
        }
    }

    showSignInState() {
        if (this.cardsStack) this.cardsStack.style.display = 'none';
        if (this.emptyState) {
            this.emptyState.style.display = 'flex';
            const title = document.getElementById('empty-title');
            const sub = document.getElementById('empty-subtitle');
            const actionBtn = document.getElementById('empty-action-btn');
            const signInBtn = document.getElementById('signin-btn');
            if (title) title.textContent = 'Bienvenido';
            if (sub) sub.textContent = 'Inicia sesion para sincronizar tus feeds.';
            if (actionBtn) actionBtn.style.display = 'none';
            if (signInBtn) signInBtn.style.display = 'inline-block';
        }
        const btns = document.querySelector('.swipe-action-buttons');
        if (btns) btns.style.display = 'none';
    }

    showLoadingState() {
        if (this.cardsStack) {
            this.cardsStack.style.display = 'flex';
            this.cardsStack.innerHTML = `
                <div class="swipe-loading-state">
                    <span class="tinder-loading-atom">
                        <span class="atom-orbit atom-orbit-1"></span>
                        <span class="atom-orbit atom-orbit-2"></span>
                        <span class="atom-orbit atom-orbit-3"></span>
                        <span class="atom-nucleus"></span>
                        <span class="atom-particle atom-particle-1"></span>
                        <span class="atom-particle atom-particle-2"></span>
                        <span class="atom-particle atom-particle-3"></span>
                    </span>
                    <span class="tinder-loading-text">Cargando posts</span>
                </div>
            `;
        }
        if (this.emptyState) this.emptyState.style.display = 'none';
        const btns = document.querySelector('.swipe-action-buttons');
        if (btns) btns.style.display = 'none';
    }

    loadListData(deckName) {
        if (typeof displayPosts === 'function') {
            const filterMap = { 'favorites': 'favorite', 'twitter': 'twitter', 'highlights': 'highlights' };
            window.currentFilter = filterMap[deckName] || deckName;
            displayPosts(allPosts);
        }
    }

    renderCards() {
        if (!this.cardsStack) return;

        if (this.currentIndex >= this.posts.length) {
            this.cardsStack.innerHTML = '';
            this.showEmptyState();
            return;
        }

        const currentPost = this.posts[this.currentIndex];
        const nextPost = this.posts[this.currentIndex + 1];

        this.cardsStack.innerHTML = '';

        if (nextPost) {
            this.cardsStack.innerHTML += this.createCardHTML(nextPost, 'swipe-card-next');
        }

        this.cardsStack.innerHTML += this.createCardHTML(currentPost, 'swipe-card-current');

        const currentCard = this.cardsStack.querySelector('.swipe-card-current');
        if (currentCard) {
            this.bindCardEvents(currentCard);
            this.loadSummaryForCard(currentCard, currentPost.link);
        }
    }

    createCardHTML(post, extraClass = '') {
        const formattedDate = typeof formatDate === 'function' ? formatDate(post.date) : '';

        return `
            <article class="swipe-card ${extraClass} swipe-card-loading" data-url="${escapeHtml(post.link)}">
                <div class="swipe-card-loader">
                    <span class="tinder-loading-atom">
                        <span class="atom-orbit atom-orbit-1"></span>
                        <span class="atom-orbit atom-orbit-2"></span>
                        <span class="atom-orbit atom-orbit-3"></span>
                        <span class="atom-nucleus"></span>
                        <span class="atom-particle atom-particle-1"></span>
                        <span class="atom-particle atom-particle-2"></span>
                        <span class="atom-particle atom-particle-3"></span>
                    </span>
                    <span class="tinder-loading-text">Analizando articulo</span>
                </div>
                <div class="swipe-card-content">
                    <div class="swipe-card-header">
                        <span class="swipe-card-source">${escapeHtml(post.blogName)}</span>
                        <span class="swipe-card-readtime"></span>
                    </div>
                    <h2 class="swipe-card-title">${escapeHtml(post.title)}</h2>
                    <div class="swipe-card-tldr">
                        <span class="swipe-tldr-label">TL;DR</span>
                        <p class="swipe-tldr-text"></p>
                    </div>
                    <div class="swipe-card-footer">
                        <span class="swipe-card-date">${formattedDate}</span>
                        <div class="swipe-flames" data-score="">
                            <span class="swipe-flame">🔥</span>
                            <span class="swipe-flame">🔥</span>
                            <span class="swipe-flame">🔥</span>
                        </div>
                    </div>
                </div>
                <div class="swipe-card-overlay swipe-overlay-left"><span>DESCARTAR</span></div>
                <div class="swipe-card-overlay swipe-overlay-right"><span>GUARDAR</span></div>
            </article>
        `;
    }

    async loadSummaryForCard(card, postUrl) {
        const tldrEl = card.querySelector('.swipe-tldr-text');
        const flamesEl = card.querySelector('.swipe-flames');
        const readtimeEl = card.querySelector('.swipe-card-readtime');
        if (!tldrEl) return;

        const showContent = () => card.classList.remove('swipe-card-loading');

        try {
            const cached = typeof getCachedSummary === 'function' ? getCachedSummary(postUrl) : null;
            if (cached?.tldr) {
                tldrEl.textContent = cached.tldr;
                showContent();
                this.updateFlames(flamesEl, cached.recommendation?.score);
                if (cached.readingTime && readtimeEl) readtimeEl.textContent = `${cached.readingTime} min`;
                return;
            }

            const interests = typeof getUserInterests === 'function' ? getUserInterests() : '';
            const data = typeof fetchSummary === 'function' ? await fetchSummary(postUrl, interests) : null;

            if (!data?.tldr) {
                tldrEl.textContent = 'Resumen no disponible';
                tldrEl.classList.add('swipe-tldr-unavailable');
                showContent();
                return;
            }

            tldrEl.textContent = data.tldr;
            showContent();
            if (typeof cacheSummaryLocally === 'function') cacheSummaryLocally(postUrl, data);
            this.updateFlames(flamesEl, data.recommendation?.score);
            if (data.readingTime && readtimeEl) readtimeEl.textContent = `${data.readingTime} min`;
        } catch (e) {
            tldrEl.textContent = 'Error al cargar';
            tldrEl.classList.add('swipe-tldr-unavailable');
            showContent();
        }
    }

    updateFlames(el, score) {
        if (!el) return;
        const count = score === 'high' ? 3 : score === 'medium' ? 2 : score === 'low' ? 1 : 0;
        el.querySelectorAll('.swipe-flame').forEach((f, i) => f.classList.toggle('active', i < count));
    }

    bindCardEvents(card) {
        card.addEventListener('pointerdown', e => this.onDragStart(e, card));
        card.addEventListener('pointermove', e => this.onDragMove(e, card));
        card.addEventListener('pointerup', e => this.onDragEnd(e, card));
        card.addEventListener('pointercancel', e => this.onDragEnd(e, card));
    }

    onDragStart(e, card) {
        this.isDragging = true;
        this.hasMoved = false;
        this.startX = e.clientX;
        this.currentX = 0;
        card.setPointerCapture(e.pointerId);
        card.style.transition = 'none';
    }

    onDragMove(e, card) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.startX;
        if (Math.abs(dx) > 10) this.hasMoved = true;
        this.currentX = dx;
        card.style.transform = `translateX(${dx}px) rotate(${dx * 0.08}deg)`;

        const progress = Math.min(Math.abs(dx) / this.threshold, 1);
        card.querySelector('.swipe-overlay-left').style.opacity = dx < 0 ? progress : 0;
        card.querySelector('.swipe-overlay-right').style.opacity = dx > 0 ? progress : 0;
        this.updateIndicator(dx < -50 ? 'left' : dx > 50 ? 'right' : 'none', progress);
    }

    onDragEnd(e, card) {
        if (!this.isDragging) return;
        this.isDragging = false;
        card.releasePointerCapture(e.pointerId);
        this.updateIndicator('none', 0);

        if (this.currentX < -this.threshold) {
            this.completeSwipe(card, 'left');
        } else if (this.currentX > this.threshold) {
            this.completeSwipe(card, 'right');
        } else {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = '';
            card.querySelector('.swipe-overlay-left').style.opacity = 0;
            card.querySelector('.swipe-overlay-right').style.opacity = 0;
            if (!this.hasMoved) this.openArticle(card.dataset.url);
        }
        this.currentX = 0;
    }

    updateIndicator(dir, progress) {
        const left = document.querySelector('.swipe-indicator-left');
        const right = document.querySelector('.swipe-indicator-right');
        if (dir === 'left') {
            left.style.opacity = progress;
            left.style.transform = `scale(${1 + progress * 0.2})`;
            right.style.opacity = 0;
        } else if (dir === 'right') {
            right.style.opacity = progress;
            right.style.transform = `scale(${1 + progress * 0.2})`;
            left.style.opacity = 0;
        } else {
            left.style.opacity = right.style.opacity = 0;
            left.style.transform = right.style.transform = '';
        }
    }

    completeSwipe(card, dir) {
        const url = card.dataset.url;
        const tx = dir === 'left' ? -window.innerWidth * 1.5 : window.innerWidth * 1.5;
        card.style.transition = 'transform 0.4s ease';
        card.style.transform = `translateX(${tx}px) rotate(${dir === 'left' ? -30 : 30}deg)`;

        if (dir === 'left' && typeof markAsCleared === 'function') markAsCleared(url);
        else if (dir === 'right') {
            if (this.currentDeck === 'inbox' && typeof markAsPending === 'function') markAsPending(url);
            else if (typeof markAsCleared === 'function') markAsCleared(url);
        }

        setTimeout(() => {
            this.currentIndex++;
            this.renderCards();
            this.updateCounter();
            this.updateDeckCounts();
        }, 300);
    }

    openArticle(url) {
        const post = this.posts.find(p => p.link === url);
        if (post && window.articleReader) window.articleReader.open(url, post.title, post.blogName);
    }

    updateCounter() {
        const cur = document.getElementById('swipe-current');
        const tot = document.getElementById('swipe-total');
        if (cur) cur.textContent = Math.min(this.currentIndex + 1, this.posts.length);
        if (tot) tot.textContent = this.posts.length;
    }

    updateDeckCounts() {
        if (typeof getStatusCounts !== 'function') return;
        const counts = getStatusCounts(allPosts);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('inbox-count', counts.inbox);
        set('saved-count', counts.pending);
        set('favorites-count', counts.favorite);
        set('twitter-count', typeof getTwitterCount === 'function' ? getTwitterCount() : 0);
        set('highlights-count', typeof getHighlightsCount === 'function' ? getHighlightsCount() : 0);
    }

    showEmptyState() {
        if (this.cardsStack) this.cardsStack.style.display = 'none';
        if (this.emptyState) {
            this.emptyState.style.display = 'flex';
            const title = document.getElementById('empty-title');
            const sub = document.getElementById('empty-subtitle');
            const actionBtn = document.getElementById('empty-action-btn');
            const signInBtn = document.getElementById('signin-btn');
            if (this.currentDeck === 'inbox') {
                if (title) title.textContent = 'Inbox vacio';
                if (sub) sub.textContent = 'Has revisado todos los posts.';
            } else {
                if (title) title.textContent = 'Nada guardado';
                if (sub) sub.textContent = 'Guarda posts desde el Inbox.';
            }
            if (actionBtn) actionBtn.style.display = 'inline-block';
            if (signInBtn) signInBtn.style.display = 'none';
        }
        const btns = document.querySelector('.swipe-action-buttons');
        if (btns) btns.style.display = 'none';
    }

    hideEmptyState() {
        if (this.cardsStack) this.cardsStack.style.display = 'flex';
        if (this.emptyState) this.emptyState.style.display = 'none';
        const btns = document.querySelector('.swipe-action-buttons');
        if (btns) btns.style.display = 'flex';
    }
}

let swipeController = null;

function initSwipeController() {
    swipeController = new SwipeController();
    window.swipeController = swipeController;
}

function switchDeck(name) {
    if (swipeController) swipeController.switchDeck(name);
}

function swipeAction(dir) {
    if (!swipeController) return;
    const card = document.querySelector('.swipe-card-current');
    if (card) swipeController.completeSwipe(card, dir);
}

function toggleViewMode() {
    const main = document.getElementById('main-content');
    if (!main) return;
    if (main.classList.contains('swipe-mode')) {
        main.classList.remove('swipe-mode');
        main.classList.add('list-mode');
        if (typeof displayPosts === 'function') displayPosts(allPosts);
    } else {
        main.classList.remove('list-mode');
        main.classList.add('swipe-mode');
        if (swipeController) swipeController.loadSwipeData(swipeController.currentDeck);
    }
}

// Initialization is now controlled by app.js after auth and data are ready
// app.js calls initSwipeController() after init() completes

window.addEventListener('postsUpdated', () => {
    if (swipeController) {
        swipeController.loadSwipeData(swipeController.currentDeck);
        swipeController.updateDeckCounts();
    }
});
