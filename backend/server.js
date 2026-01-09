const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Enable CORS - allows your frontend to call this API
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Log all requests (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Health check endpoint - verify API is running
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// RSS feed proxy endpoint
app.get('/api/feed', async (req, res) => {
  const { url } = req.query;

  // Validation
  if (!url) {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'URL parameter is required'
    });
  }

  // Basic URL validation
  try {
    new URL(url); // Throws if invalid URL
  } catch (e) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'The provided URL is not valid'
    });
  }

  // Fetch the RSS feed
  try {
    console.log(`Fetching RSS feed: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'User-Agent': 'Particulas-elementales/1.0 (Blog Reader)'
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5
    });

    // Return the RSS XML content
    res.set('Content-Type', 'application/xml');
    res.send(response.data);

  } catch (error) {
    console.error(`Error fetching feed ${url}:`, error.message);

    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout',
        message: 'The feed took too long to respond'
      });
    }

    if (error.response) {
      // Feed returned an error status
      return res.status(error.response.status).json({
        error: 'Feed error',
        message: `Feed returned status ${error.response.status}`
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Failed to fetch feed',
      message: error.message
    });
  }
});

// Article content extraction endpoint
app.get('/api/article', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'URL parameter required'
    });
  }

  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'The provided URL is not valid'
    });
  }

  try {
    console.log(`Extracting article content from: ${url}`);

    // Fetch the article HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    // Parse HTML with JSDOM
    const dom = new JSDOM(response.data, {
      url,
      // Enable execution of scripts: false for security
      runScripts: 'outside-only'
    });

    // Use Readability to extract article content
    const reader = new Readability(dom.window.document, {
      debug: false,
      maxElemsToParse: 0, // No limit
      nbTopCandidates: 5,
      charThreshold: 500
    });

    const article = reader.parse();

    if (!article) {
      console.log(`Could not extract article from ${url}`);
      return res.status(404).json({
        error: 'Extraction failed',
        message: 'Could not extract article content from this page'
      });
    }

    console.log(`Successfully extracted article: ${article.title} (${article.length} words)`);

    // Return clean article data
    res.json({
      title: article.title,
      content: article.content,  // Clean HTML
      textContent: article.textContent,  // Plain text
      length: article.length,  // Word count
      excerpt: article.excerpt,
      byline: article.byline,  // Author
      siteName: article.siteName,
      publishedTime: article.publishedTime,
      dir: article.dir  // Text direction (ltr/rtl)
    });

  } catch (error) {
    console.error('Article extraction error:', error.message);

    // Handle specific errors
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout',
        message: 'The article took too long to load'
      });
    }

    if (error.response) {
      // Website returned error
      if (error.response.status === 403 || error.response.status === 401) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This website blocks automated access'
        });
      }

      if (error.response.status === 404) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Article not found at this URL'
        });
      }

      if (error.response.status === 402 || error.response.status === 451) {
        return res.status(402).json({
          error: 'Paywall detected',
          message: 'This article is behind a paywall'
        });
      }
    }

    // Generic error
    res.status(500).json({
      error: 'Failed to extract article',
      message: error.message
    });
  }
});

// RSS feed discovery endpoint
app.get('/api/discover-feed', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'URL parameter required'
    });
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'The provided URL is not valid'
    });
  }

  try {
    console.log(`Discovering RSS feed for: ${url}`);

    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 10000,
      maxRedirects: 5
    });

    const html = response.data;
    const feeds = [];

    // Parse HTML to find feed links
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Look for <link rel="alternate" type="application/rss+xml">
    const linkElements = document.querySelectorAll('link[rel="alternate"]');
    linkElements.forEach(link => {
      const type = link.getAttribute('type') || '';
      const href = link.getAttribute('href');

      if (href && (type.includes('rss') || type.includes('atom') || type.includes('xml'))) {
        // Convert relative URLs to absolute
        const feedUrl = new URL(href, url).href;
        const title = link.getAttribute('title') || 'RSS Feed';
        feeds.push({ url: feedUrl, title, type });
      }
    });

    // If no feeds found, try common feed paths
    if (feeds.length === 0) {
      const commonPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/feed/'];
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

      for (const path of commonPaths) {
        try {
          const testUrl = baseUrl + path;
          const testResponse = await axios.head(testUrl, {
            timeout: 5000,
            validateStatus: status => status < 400
          });

          const contentType = testResponse.headers['content-type'] || '';
          if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
            feeds.push({ url: testUrl, title: 'RSS Feed', type: contentType });
            break; // Found one, stop looking
          }
        } catch (e) {
          // This path doesn't exist, try next
        }
      }
    }

    if (feeds.length === 0) {
      return res.status(404).json({
        error: 'No feed found',
        message: 'Could not discover an RSS feed for this website'
      });
    }

    console.log(`Found ${feeds.length} feed(s) for ${url}`);
    res.json({ feeds });

  } catch (error) {
    console.error('Feed discovery error:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout',
        message: 'The website took too long to respond'
      });
    }

    res.status(500).json({
      error: 'Discovery failed',
      message: error.message
    });
  }
});

// Catch-all for 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.path} not found`
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`Partículas elementales API Server`);
  console.log(`Running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===========================================`);
  console.log(`Available endpoints:`);
  console.log(`  GET /health - Health check`);
  console.log(`  GET /api/feed?url=<feed-url> - Fetch RSS feed`);
  console.log(`  GET /api/article?url=<article-url> - Extract article content`);
  console.log(`  GET /api/discover-feed?url=<website-url> - Discover RSS feed`);
  console.log(`===========================================`);
});
