// Configuration
const WEB_URL = 'https://particulas-elementales.pages.dev';

// State
let currentTab = null;
let detectedFeeds = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Update page info
  document.getElementById('pageTitle').textContent = tab.title || 'Untitled';
  document.getElementById('pageUrl').textContent = new URL(tab.url).hostname;

  // Check for RSS feeds
  await detectRssFeeds();

  // Setup button handlers
  setupEventListeners();
});

// Detect RSS feeds on current page
async function detectRssFeeds() {
  const statusEl = document.getElementById('rssStatus');
  const statusTextEl = document.getElementById('rssStatusText');
  const subscribeBtn = document.getElementById('subscribeRss');

  // Check if we can access this tab
  if (!currentTab?.url) {
    statusTextEl.textContent = 'Cannot access this page';
    return;
  }

  // Skip restricted URLs
  const url = currentTab.url;
  if (url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('chrome.google.com/webstore')) {
    statusTextEl.textContent = 'Cannot check RSS on this page';
    return;
  }

  try {
    // Execute content script to find RSS feeds
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: findRssFeeds
    });

    detectedFeeds = results[0]?.result || [];

    if (detectedFeeds.length > 0) {
      statusEl.classList.remove('not-found');
      statusEl.classList.add('found');
      statusTextEl.textContent = `RSS feed found: ${detectedFeeds[0].title || 'Feed'}`;
      subscribeBtn.disabled = false;
    } else {
      statusTextEl.textContent = 'No RSS feed detected';
    }
  } catch (error) {
    console.error('Error detecting RSS:', error);
    // Provide more specific error message
    if (error.message?.includes('Cannot access')) {
      statusTextEl.textContent = 'Cannot access this page';
    } else {
      statusTextEl.textContent = 'No RSS feed detected';
    }
  }
}

// Function to run in page context to find RSS feeds
function findRssFeeds() {
  const feeds = [];

  // Check link elements for RSS/Atom feeds
  const linkElements = document.querySelectorAll(
    'link[type="application/rss+xml"], ' +
    'link[type="application/atom+xml"], ' +
    'link[rel="alternate"][type="application/rss+xml"], ' +
    'link[rel="alternate"][type="application/atom+xml"]'
  );

  linkElements.forEach(link => {
    const href = link.href || link.getAttribute('href');
    if (href) {
      feeds.push({
        url: href,
        title: link.title || 'RSS Feed',
        type: link.type
      });
    }
  });

  // Check for common feed URL patterns if no link found
  if (feeds.length === 0) {
    const hostname = window.location.hostname;

    // Substack
    if (hostname.includes('substack.com')) {
      feeds.push({
        url: window.location.origin + '/feed',
        title: 'Substack Feed',
        type: 'application/rss+xml'
      });
    }

    // WordPress common patterns
    const wpFeedUrls = ['/feed', '/feed/', '/rss', '/rss/'];
    // We'll try these later via the backend
  }

  return feeds;
}

// Setup event listeners
function setupEventListeners() {
  // Add Article button
  document.getElementById('addArticle').addEventListener('click', () => {
    const url = encodeURIComponent(currentTab.url);
    const title = encodeURIComponent(currentTab.title || '');

    // Open web app with article URL as parameter
    chrome.tabs.create({
      url: `${WEB_URL}?action=add-article&url=${url}&title=${title}`
    });

    window.close();
  });

  // Subscribe to RSS button
  document.getElementById('subscribeRss').addEventListener('click', () => {
    if (detectedFeeds.length === 0) return;

    const feedUrl = encodeURIComponent(detectedFeeds[0].url);
    const feedTitle = encodeURIComponent(detectedFeeds[0].title || new URL(currentTab.url).hostname);

    // Open web app with feed URL as parameter
    chrome.tabs.create({
      url: `${WEB_URL}?action=add-blog&url=${feedUrl}&name=${feedTitle}`
    });

    window.close();
  });
}
