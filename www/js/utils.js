/**
 * Shared utility functions for Particulas Elementales
 */

// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ============================================================
// SUMMARY CACHE MANAGEMENT (localStorage)
// ============================================================

const SUMMARY_CACHE_KEY = 'summaryCache';
const SUMMARY_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCachedSummary(url) {
    try {
        const cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
        const cached = cache[url];
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > SUMMARY_CACHE_MAX_AGE) {
            delete cache[url];
            localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
            return null;
        }

        return cached.data;
    } catch (e) {
        console.error('Error reading summary cache:', e);
        return null;
    }
}

function cacheSummaryLocally(url, data) {
    try {
        let cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
        cache[url] = { data, timestamp: Date.now() };
        localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Error caching summary:', e);
    }
}

// ============================================================
// API HELPERS
// ============================================================

function getApiBaseUrl() {
    return window.API_BASE_URL || 'http://localhost:3000';
}

async function fetchSummary(articleUrl, interests = '') {
    const API_BASE_URL = getApiBaseUrl();
    let apiUrl = `${API_BASE_URL}/api/summary?url=${encodeURIComponent(articleUrl)}`;
    if (interests) {
        apiUrl += `&interests=${encodeURIComponent(interests)}`;
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
        return null;
    }

    return response.json();
}
