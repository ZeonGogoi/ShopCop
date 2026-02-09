const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());

const PORT = 3001;

app.get('/api/price', async (req, res) => {
    const { barcode, store } = req.query;

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    console.log(`[Proxy] Fetching price for ${barcode} at ${store || 'walmart'}`);

    let offProduct = null;
    let scrapedData = { price: null, name: null, image: null };

    // 1. Try OpenFoodFacts first for name
    try {
        console.log('[Proxy] Step 1: Checking OpenFoodFacts for metadata...');
        offProduct = await new Promise((resolve, reject) => {
            const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
            const req = https.get(offUrl, (offRes) => {
                let data = '';
                offRes.on('data', (chunk) => data += chunk);
                offRes.on('end', () => {
                    try {
                        const offData = JSON.parse(data);
                        if (offData.status === 1 && offData.product) {
                            console.log(`[OpenFoodFacts] Found: ${offData.product.product_name}`);
                            resolve({
                                name: offData.product.product_name || offData.product.generic_name,
                                image: offData.product.image_url || offData.product.image_front_url,
                                quantity: offData.product.quantity || offData.product.product_quantity // Get size/weight
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) { resolve(null); }
                });
            });
            req.on('error', (e) => resolve(null));
        });
    } catch (err) {
        console.warn('[OpenFoodFacts] Check failed:', err.message);
    }

    // 2. Metoda PriceAPI (User Provided Key)
    const METODA_KEY = 'MKMRYDUCFPVFLUVJXFKOOSMNZKEYUTPNYOJOFLHVEXPUNZIFHVWBXSHBVMUXQFVY';

    if (METODA_KEY) {
        console.log(`[Proxy] Step 2: Checking Metoda PriceAPI (Real-Time)...`);
        try {
            // A. Create Job
            const jobRes = await axios.post('https://api.priceapi.com/v2/jobs', {
                token: METODA_KEY,
                country: 'us',
                source: 'google_shopping',
                topic: 'product_and_offers',
                key: 'gtin',
                values: barcode
            });

            const jobId = jobRes.data.job_id;
            console.log(`[Metoda] Job Created: ${jobId}. Polling...`);

            // B. Poll (Max 10s)
            let status = 'working';
            const startTime = Date.now();
            while ((status === 'working' || status === 'pending') && (Date.now() - startTime < 10000)) {
                await new Promise(r => setTimeout(r, 1000));
                const statusRes = await axios.get(`https://api.priceapi.com/v2/jobs/${jobId}?token=${METODA_KEY}`);
                status = statusRes.data.status;
            }

            // C. Download
            if (status === 'finished') {
                const dlRes = await axios.get(`https://api.priceapi.com/v2/jobs/${jobId}/download.json?token=${METODA_KEY}`);
                const results = dlRes.data.results;

                if (results && results.length > 0 && results[0].success) {
                    const item = results[0];
                    if (item.price || item.min_price) {
                        scrapedData.price = (item.price || item.min_price).toFixed(2);
                        scrapedData.name = item.name;
                        scrapedData.source = 'Metoda API (Verified)';
                        console.log(`[Metoda] Success! Found: $${scrapedData.price}`);
                    }
                } else {
                    console.log('[Metoda] Job finished but no match found.');
                }
            } else {
                console.log('[Metoda] Polling timed out. Skipping.');
            }

        } catch (e) {
            console.warn('[Metoda] Error/No Match:', e.message);
        }
    }

    // 3. HTTP Scraper (Axios + Cheerio) - Yahoo Search Proxy
    // Only run if Metoda didn't find a price
    if (!scrapedData.price) {
        console.log(`[Proxy] Step 3: HTTP Scraping via Yahoo (Backup)...`);

        // Helper function to scrape Yahoo
        async function scrapeYahoo(query) {
            const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
            console.log(`[Proxy] Requesting Yahoo: ${yahooUrl}`);

            try {
                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                };

                const response = await axios.get(yahooUrl, { headers });
                const $ = cheerio.load(response.data);

                let result = null;

                // Yahoo selectors: .algo
                $('.algo').each((i, el) => {
                    if (result) return; // Stop if found

                    const title = $(el).find('h3').text().trim();
                    const snippet = $(el).find('.compText').text().trim() || $(el).find('p').text().trim();
                    const fullText = `${title} ${snippet}`;

                    // Debug Log
                    if (i < 3) console.log(`[Proxy] Yahoo Result ${i}: "${title.substring(0, 50)}..."`);

                    const priceMatch = fullText.match(/\$\s?(\d+\.\d{2})/);
                    if (priceMatch) {
                        const price = priceMatch[1];
                        console.log(`[Proxy] Found Price in Yahoo: $${price} ("${title}")`);
                        result = { price, name: title };
                    }
                });
                return result;

            } catch (e) {
                console.error(`[Proxy] Yahoo Scrape Error for "${query}":`, e.message);
                return null;
            }
        }

        // Choose Domain
        let storeDomain = 'walmart.com';
        const targetStore = (store || 'walmart').toLowerCase();
        switch (targetStore) {
            // Grocery
            case 'target': storeDomain = 'target.com'; break;
            case 'publix': storeDomain = 'publix.com'; break;
            case 'wholefoods': storeDomain = 'wholefoodsmarket.com'; break;
            case 'kroger': storeDomain = 'kroger.com'; break;
            case 'acme': storeDomain = 'acmemarkets.com'; break;
            case 'shoprite': storeDomain = 'shoprite.com'; break;
            // Wholesale
            case 'costco': storeDomain = 'costco.com'; break;
            case 'samsclub': storeDomain = 'samsclub.com'; break;
            case 'bjs': storeDomain = 'bjs.com'; break;
            // Tech
            case 'bestbuy': storeDomain = 'bestbuy.com'; break;
            case 'microcenter': storeDomain = 'microcenter.com'; break;
            case 'gamestop': storeDomain = 'gamestop.com'; break;
            // Home
            case 'homedepot': storeDomain = 'homedepot.com'; break;
            case 'lowes': storeDomain = 'lowes.com'; break;
            case 'ikea': storeDomain = 'ikea.com'; break;
            case 'bobs': storeDomain = 'mybobs.com'; break;
            // Apparel
            case 'macys': storeDomain = 'macys.com'; break;
            case 'kohls': storeDomain = 'kohls.com'; break;
            case 'nordstrom': storeDomain = 'nordstrom.com'; break;
            case 'zappos': storeDomain = 'zappos.com'; break;
            // Office
            case 'staples': storeDomain = 'staples.com'; break;
            case 'officedepot': storeDomain = 'officedepot.com'; break;
            // Pet
            case 'petsmart': storeDomain = 'petsmart.com'; break;
            case 'petco': storeDomain = 'petco.com'; break;
            // Pharmacy
            case 'walgreens': storeDomain = 'walgreens.com'; break;
            case 'cvs': storeDomain = 'cvs.com'; break;
            // General Merchandise
            case 'amazon': storeDomain = 'amazon.com'; break;
            case 'ebay': storeDomain = 'ebay.com'; break;
            case 'walmart': storeDomain = 'walmart.com'; break; // Explicitly added for clarity, though it's the default

            default: storeDomain = 'walmart.com';
        }

        // A. Specific Store Search
        const specificQuery = `site:${storeDomain} ${barcode}`;
        const specificResult = await scrapeYahoo(specificQuery);

        if (specificResult) {
            scrapedData = { ...scrapedData, ...specificResult, image: null };
        }

        // B. Universal Fallback
        if (!scrapedData.price && offProduct && offProduct.name) {
            console.log('[Proxy] Specific search failed. Attempting Universal Name search on Yahoo...');
            let cleanName = offProduct.name.split(',')[0].trim();
            if (offProduct.quantity) cleanName += ` ${offProduct.quantity}`;
            const universalQuery = `${cleanName} price`;

            const universalResult = await scrapeYahoo(universalQuery);
            if (universalResult) {
                scrapedData = { ...scrapedData, ...universalResult, image: null };
            }
        }
    }

    // HYBRID MERGE (Same as before)
    let finalPrice = 0.00;
    if (scrapedData.price) {
        finalPrice = parseFloat(scrapedData.price.replace(/[^0-9.]/g, ''));
    }

    // Multipack Calc (Yahoo-based)
    if (finalPrice > 0 && scrapedData.name) {
        const packRegex = /(\d+)\s?([xX])?\s?(pk|pack|ct|count|can|bottle)/i;
        const match = scrapedData.name.match(packRegex);
        if (match && match[1]) {
            const count = parseInt(match[1]);
            if (count > 1 && finalPrice > 2.00) {
                console.log(`[Proxy] Detected pack in Result: ${count}. Adjusting price.`);
                finalPrice = finalPrice / count;
                scrapedData.name += ` (${count}-pk)`;
            }
        }
    }

    // --- FALLBACK: PRICE ESTIMATION (NO ZERO PRICE POLICY) ---
    // User Request: "Just give a price, no more 0.00"
    if (finalPrice === 0 || !finalPrice) {
        const productName = offProduct?.name || scrapedData.name || 'Generic Item';
        console.log(`[Proxy] Scraper failed (Price 0.00). Estimating price for: "${productName}"`);

        // Estimation Logic
        const estimatePrice = (name) => {
            const lowerName = name.toLowerCase();

            // 1. Packs/Cases (High Value keywords)
            if (lowerName.match(/(\d+)\s?(pk|pack|case|count|ct)/) || lowerName.includes('pack') || lowerName.includes('case')) {
                if (lowerName.includes('water')) return 6.99;
                if (lowerName.includes('soda') || lowerName.includes('pop') || lowerName.includes('cola')) return 9.99;
                if (lowerName.includes('beer') || lowerName.includes('ale')) return 16.99;
                if (lowerName.includes('chip') || lowerName.includes('snack')) return 12.99;
                return 14.99; // Generic large pack average
            }

            // 2. Single Items (Keyword Matching)
            if (lowerName.includes('water')) return 1.49; // Single bottle
            if (lowerName.includes('soda') || lowerName.includes('pop') || lowerName.includes('cola') || lowerName.includes('pepsi') || lowerName.includes('coke') || lowerName.includes('dr pepper') || lowerName.includes('sprite')) return 2.49;
            if (lowerName.includes('energy') || lowerName.includes('monster') || lowerName.includes('red bull')) return 3.29;
            if (lowerName.includes('milk')) return 4.29;
            if (lowerName.includes('egg')) return 4.99;
            if (lowerName.includes('bread') || lowerName.includes('bagel') || lowerName.includes('bun')) return 3.49;
            if (lowerName.includes('butter') || lowerName.includes('margarine')) return 5.49;
            if (lowerName.includes('cheese')) return 5.99;
            if (lowerName.includes('yogurt')) return 1.29;

            if (lowerName.includes('chip') || lowerName.includes('dorito') || lowerName.includes('lay') || lowerName.includes('pringles')) return 4.79;
            if (lowerName.includes('cereal') || lowerName.includes('cheerio') || lowerName.includes('flake') || lowerName.includes('loop')) return 5.49;
            if (lowerName.includes('cookie') || lowerName.includes('oreo') || lowerName.includes('keebler')) return 4.49;
            if (lowerName.includes('candy') || lowerName.includes('chocolate') || lowerName.includes('bar') || lowerName.includes('gum')) return 1.99;
            if (lowerName.includes('ice cream') || lowerName.includes('gelato')) return 5.99;

            if (lowerName.includes('meat') || lowerName.includes('beef') || lowerName.includes('steak')) return 12.99;
            if (lowerName.includes('chicken') || lowerName.includes('poultry')) return 8.99;
            if (lowerName.includes('pork') || lowerName.includes('bacon') || lowerName.includes('sausage')) return 7.99;
            if (lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('shrimp')) return 11.99;

            if (lowerName.includes('coffee')) return 9.99;
            if (lowerName.includes('tea')) return 3.99;
            if (lowerName.includes('juice') || lowerName.includes('lemonade')) return 4.29;

            if (lowerName.includes('soap') || lowerName.includes('shampoo') || lowerName.includes('detergent') || lowerName.includes('clean')) return 8.99;
            if (lowerName.includes('paper') || lowerName.includes('towel') || lowerName.includes('tissue') || lowerName.includes('toilet')) return 8.49;
            if (lowerName.includes('paste') || lowerName.includes('brush')) return 3.99;

            if (lowerName.includes('fruit') || lowerName.includes('apple') || lowerName.includes('banana') || lowerName.includes('orange') || lowerName.includes('grape')) return 2.99; // Per lb avg often tricky, just flat rate
            if (lowerName.includes('vegetable') || lowerName.includes('lettuce') || lowerName.includes('tomato') || lowerName.includes('onion')) return 1.99;

            // 3. Last Resort Average
            return 3.99;
        };

        finalPrice = estimatePrice(productName);
        scrapedData.source = 'Estimated (Market Avg)';
    }

    const finalName = offProduct?.name || scrapedData.name || 'Unknown Product';
    const finalImage = offProduct?.image || scrapedData.image || '';
    const source = (finalPrice > 0 && !scrapedData.source) ? (offProduct ? 'OpenFoodFacts + Yahoo' : 'Yahoo Only') : (scrapedData.source || 'Estimated');

    res.json({
        success: true,
        product: {
            name: finalName,
            price: finalPrice,
            image: finalImage,
            source: source
        }
    });

});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
