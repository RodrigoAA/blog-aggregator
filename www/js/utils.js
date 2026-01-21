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
        return null;
    }
}

function cacheSummaryLocally(url, data) {
    try {
        let cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
        cache[url] = { data, timestamp: Date.now() };
        localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        // Handle QuotaExceededError by clearing oldest entries
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            try {
                let cache = JSON.parse(localStorage.getItem(SUMMARY_CACHE_KEY) || '{}');
                const entries = Object.entries(cache);
                if (entries.length > 0) {
                    // Sort by timestamp and remove oldest half
                    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                    const toKeep = entries.slice(Math.floor(entries.length / 2));
                    cache = Object.fromEntries(toKeep);
                    cache[url] = { data, timestamp: Date.now() };
                    localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
                }
            } catch (retryError) {
                // Silent fail - caching is best-effort
            }
        }
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

// ============================================================
// FETCH WITH TIMEOUT AND RETRY
// ============================================================

/**
 * Fetch with timeout and optional retry
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @param {number} retries - Number of retries on timeout (default: 1)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = 30000, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                if (attempt < retries) continue;
                throw new Error(`Request timeout (${timeout}ms)`);
            }
            throw error;
        }
    }
}
