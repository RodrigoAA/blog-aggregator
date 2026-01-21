const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const OpenAI = require('openai');
require('dotenv').config();

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  HTTP: {
    TIMEOUT_DEFAULT: 15000,
    TIMEOUT_FAST: 5000,
    TIMEOUT_DISCOVERY: 10000,
    MAX_REDIRECTS: 5
  },
  TEXT: {
    MAX_CHARS_SUMMARY: 12000,
    MAX_CHARS_TTS: 4096
  },
  OPENAI: {
    MAX_TOKENS: 500,
    TEMPERATURE: 0.3
  }
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// IN-MEMORY CACHE
// ============================================================

// Feed cache (5 minute TTL)
const feedCache = new Map();
const FEED_CACHE_TTL = 5 * 60 * 1000;

// Summary cache (7 day TTL - summaries rarely change)
const summaryCache = new Map();
const SUMMARY_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Max cache entries (to prevent memory leaks)
const MAX_CACHE_ENTRIES = 100;

function getCachedFeed(url) {
    const cached = feedCache.get(url);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > FEED_CACHE_TTL) {
        feedCache.delete(url);
        return null;
    }
    return cached.data;
}

function setCachedFeed(url, data) {
    // Evict oldest entry if cache is full
    if (feedCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = feedCache.keys().next().value;
        feedCache.delete(oldestKey);
    }
    feedCache.set(url, { data, timestamp: Date.now() });
}

function getCachedSummary(url, interests) {
    const cacheKey = `${url}|${interests || ''}`;
    const cached = summaryCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > SUMMARY_CACHE_TTL) {
        summaryCache.delete(cacheKey);
        return null;
    }
    return cached.data;
}

function setCachedSummary(url, interests, data) {
    const cacheKey = `${url}|${interests || ''}`;
    // Evict oldest entry if cache is full
    if (summaryCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = summaryCache.keys().next().value;
        summaryCache.delete(oldestKey);
    }
    summaryCache.set(cacheKey, { data, timestamp: Date.now() });
}

// ============================================================
// VALIDATION MIDDLEWARE
// ============================================================

/**
 * Middleware to validate URL query parameter
 */
function validateUrlParam(req, res, next) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'URL parameter required'
    });
  }

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'The provided URL is not valid'
    });
  }

  next();
}

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

// RSS feed proxy endpoint (with in-memory cache)
app.get('/api/feed', validateUrlParam, async (req, res) => {
  const { url } = req.query;

  // Check cache first
  const cached = getCachedFeed(url);
  if (cached) {
    res.set({
      'Content-Type': 'application/xml',
      'X-Cache': 'HIT'
    });
    return res.send(cached);
  }

  // Fetch the RSS feed
  try {
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'User-Agent': 'Particulas-elementales/1.0 (Blog Reader)'
      },
      timeout: CONFIG.HTTP.TIMEOUT_DEFAULT,
      maxRedirects: CONFIG.HTTP.MAX_REDIRECTS
    });

    // Store in cache
    setCachedFeed(url, response.data);

    // Return the RSS XML content
    res.set({
      'Content-Type': 'application/xml',
      'X-Cache': 'MISS'
    });
    res.send(response.data);

  } catch (error) {

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
app.get('/api/article', validateUrlParam, async (req, res) => {
  const { url } = req.query;

  try {
    // Fetch the article HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: CONFIG.HTTP.TIMEOUT_DEFAULT,
      maxRedirects: CONFIG.HTTP.MAX_REDIRECTS
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
      return res.status(404).json({
        error: 'Extraction failed',
        message: 'Could not extract article content from this page'
      });
    }

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
app.get('/api/discover-feed', validateUrlParam, async (req, res) => {
  const { url } = req.query;
  const parsedUrl = new URL(url);

  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: CONFIG.HTTP.TIMEOUT_DISCOVERY,
      maxRedirects: CONFIG.HTTP.MAX_REDIRECTS
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
            timeout: CONFIG.HTTP.TIMEOUT_FAST,
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

    res.json({ feeds });

  } catch (error) {

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

// Article summary endpoint (AI-powered, with cache)
app.get('/api/summary', validateUrlParam, async (req, res) => {
  const { url, interests } = req.query;

  // Check cache first (saves OpenAI API costs and time)
  const cached = getCachedSummary(url, interests);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    // 1. Fetch the article HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      timeout: CONFIG.HTTP.TIMEOUT_DEFAULT,
      maxRedirects: CONFIG.HTTP.MAX_REDIRECTS
    });

    // 2. Parse and extract article content
    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return res.status(404).json({
        error: 'Extraction failed',
        message: 'Could not extract article content'
      });
    }

    // 3. Truncate text if too long (keep under token limits)
    const text = article.textContent.slice(0, CONFIG.TEXT.MAX_CHARS_SUMMARY);

    // 4. Build prompt based on whether user has interests
    const hasInterests = interests && interests.trim().length > 0;

    const systemPrompt = hasInterests
      ? `You are a helpful assistant that summarizes articles and provides personalized reading recommendations.
ALWAYS respond in SPANISH, regardless of the article's language.
Return JSON with this EXACT structure (all fields required):
{
  "tldr": "2-3 sentence summary of the main point",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "recommendation": {
    "score": "high",
    "reason": "Brief explanation of relevance to reader interests"
  }
}
IMPORTANT:
- Provide 3-5 key points
- The recommendation.score MUST be exactly one of: "high", "medium", or "low"
- The recommendation.reason should explain why this article matches or doesn't match the reader's interests
- You MUST include the recommendation field`
      : `You are a helpful assistant that summarizes articles.
ALWAYS respond in SPANISH, regardless of the article's language.
Return JSON with this exact structure:
{
  "tldr": "2-3 sentence summary of the main point",
  "keyPoints": ["key point 1", "key point 2", "key point 3"]
}
Provide 3-5 key points. Be concise and informative.`;

    const userPrompt = hasInterests
      ? `Reader's interests: ${interests}\n\nSummarize this article and assess its relevance:\n\n${text}`
      : `Summarize this article:\n\n${text}`;

    // 5. Call OpenAI for summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: CONFIG.OPENAI.MAX_TOKENS,
      temperature: CONFIG.OPENAI.TEMPERATURE
    });

    const summary = JSON.parse(completion.choices[0].message.content);

    // Calculate reading time (average 200 words per minute)
    const wordCount = article.textContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Build result
    const result = {
      tldr: summary.tldr,
      keyPoints: summary.keyPoints,
      model: 'gpt-4o-mini',
      articleTitle: article.title,
      readingTime: readingTime
    };

    // Include recommendation if present
    if (summary.recommendation) {
      result.recommendation = summary.recommendation;
    }

    // Store in cache for future requests
    setCachedSummary(url, interests, result);

    res.json(result);

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout',
        message: 'The article took too long to load'
      });
    }

    if (error.response?.status === 401) {
      return res.status(500).json({
        error: 'API error',
        message: 'OpenAI API key is invalid or missing'
      });
    }

    res.status(500).json({
      error: 'Summary failed',
      message: error.message
    });
  }
});

// Text-to-Speech endpoint (OpenAI TTS)
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'nova' } = req.body;

  if (!text) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Text parameter required'
    });
  }

  // OpenAI TTS has a character limit
  if (text.length > CONFIG.TEXT.MAX_CHARS_TTS) {
    return res.status(400).json({
      error: 'Text too long',
      message: `Text must be under ${CONFIG.TEXT.MAX_CHARS_TTS} characters. Split into chunks on the client.`
    });
  }

  // Validate voice
  const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  if (!validVoices.includes(voice)) {
    return res.status(400).json({
      error: 'Invalid voice',
      message: `Voice must be one of: ${validVoices.join(', ')}`
    });
  }

  try {
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3'
    });

    // Get the audio as a buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    // Return as audio file
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });
    res.send(buffer);

  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(500).json({
        error: 'API error',
        message: 'OpenAI API key is invalid or missing'
      });
    }

    res.status(500).json({
      error: 'TTS failed',
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
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /api/feed?url=<feed-url> - Fetch RSS feed`);
  console.log(`  GET  /api/article?url=<article-url> - Extract article content`);
  console.log(`  GET  /api/discover-feed?url=<website-url> - Discover RSS feed`);
  console.log(`  GET  /api/summary?url=<article-url> - Generate AI summary`);
  console.log(`  POST /api/tts - Text-to-speech (OpenAI)`);
  console.log(`===========================================`);
});
