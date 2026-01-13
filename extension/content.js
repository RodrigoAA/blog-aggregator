// Content script for Partículas Elementales extension
// This runs on every page to help detect RSS feeds

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectFeeds') {
    const feeds = detectRssFeeds();
    sendResponse({ feeds });
  }
  return true;
});

// Detect RSS feeds on the page
function detectRssFeeds() {
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
      // Resolve relative URLs
      const absoluteUrl = new URL(href, window.location.origin).href;
      feeds.push({
        url: absoluteUrl,
        title: link.title || document.title || 'RSS Feed',
        type: link.type
      });
    }
  });

  // Platform-specific feed detection
  const hostname = window.location.hostname;

  if (feeds.length === 0) {
    // Substack
    if (hostname.includes('substack.com')) {
      feeds.push({
        url: window.location.origin + '/feed',
        title: document.title || 'Substack Feed',
        type: 'application/rss+xml'
      });
    }

    // Medium
    if (hostname.includes('medium.com')) {
      const path = window.location.pathname;
      if (path.startsWith('/@')) {
        const username = path.split('/')[1];
        feeds.push({
          url: `https://medium.com/feed/${username}`,
          title: document.title || 'Medium Feed',
          type: 'application/rss+xml'
        });
      }
    }

    // Ghost blogs often have /rss/
    // WordPress blogs often have /feed/
    // These will be tried via the backend's discover-feed endpoint
  }

  return feeds;
}
