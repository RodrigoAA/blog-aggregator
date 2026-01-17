/**
 * Simple test script to check if RSS feed fetching works
 * without requiring OpenAI API key
 */

const axios = require('axios');

async function testFeedFetch(url) {
    console.log(`\nTesting feed fetch: ${url}`);
    console.log('='.repeat(60));

    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
                'User-Agent': 'Particulas-elementales/1.0 (Blog Reader)'
            },
            timeout: 15000,
            maxRedirects: 5
        });

        console.log(`✓ Status: ${response.status}`);
        console.log(`✓ Content-Type: ${response.headers['content-type']}`);
        console.log(`✓ Content length: ${response.data.length} bytes`);

        // Check if it's valid XML
        if (response.data.includes('<rss') || response.data.includes('<feed')) {
            console.log('✓ Valid RSS/Atom feed detected');

            // Extract title if present
            const titleMatch = response.data.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
                console.log(`✓ Feed title: ${titleMatch[1]}`);
            }

            return true;
        } else {
            console.log('✗ Response does not appear to be a valid RSS/Atom feed');
            return false;
        }

    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP Status: ${error.response.status}`);
            console.log(`  Status Text: ${error.response.statusText}`);
        }
        return false;
    }
}

async function runTests() {
    console.log('RSS Feed Fetch Testing');
    console.log('='.repeat(60));

    const testFeeds = [
        'https://www.rodobo.es/feed',
        'https://shreyasdoshi.substack.com/feed',
        'https://www.henrikkarlsson.xyz/feed'
    ];

    let passed = 0;
    let failed = 0;

    for (const feedUrl of testFeeds) {
        const result = await testFeedFetch(feedUrl);
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
