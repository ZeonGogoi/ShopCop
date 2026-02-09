const axios = require('axios');
const cheerio = require('cheerio');

async function testScraper() {
    const barcode = '075720481279'; // Poland Spring Water
    const storeDomain = 'walmart.com'; // or just general search

    console.log('Testing Scraper for:', barcode);

    // 1. Simulate OFF Data (Hardcoded for test)
    const offProduct = {
        name: 'Poland Spring Water',
        quantity: '500 ml' // 16.9 oz ~ 500ml or just use what OFF gives
    };

    console.log('Product:', offProduct);

    // 2. Try Universal Search
    let cleanName = offProduct.name.split(',')[0].trim();
    if (offProduct.quantity) cleanName += ` ${offProduct.quantity}`;

    const universalQuery = `${cleanName} price`;
    // Switch to Bing
    const universalUrl = `https://www.bing.com/search?q=${encodeURIComponent(universalQuery)}`;

    console.log(`Requesting Bing: ${universalUrl}`);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    try {
        const response = await axios.get(universalUrl, { headers });
        console.log('Response Status:', response.status);

        const $ = cheerio.load(response.data);
        console.log('Page Title:', $('title').text());

        let foundPrice = null;

        // Bing selectors: .b_algo
        $('.b_algo').each((i, el) => {
            const title = $(el).find('h2').text().trim();
            const allText = $(el).text().replace(/\s+/g, ' ').trim(); // Flatten text

            console.log(`\n--- Result ${i} ---`);
            console.log('Title:', title);
            console.log('Full Text:', allText.substring(0, 200) + '...'); // Log start of text

            const priceMatch = allText.match(/\$\s?(\d+\.\d{2})/);
            if (priceMatch) {
                console.log('MATCHED PRICE:', priceMatch[1]);
                foundPrice = priceMatch[1];
            } else {
                console.log('No price match.');
            }
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testScraper();
