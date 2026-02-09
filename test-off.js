const https = require('https');

const barcode = '049000028904';
const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

console.log('Fetching:', offUrl);

const req = https.get(offUrl, { headers: { 'User-Agent': 'GroceryScanner/1.0' } }, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            console.log('Data length:', data.length);
            const offData = JSON.parse(data);
            console.log('OFF Status:', offData.status);
            if (offData.product) {
                console.log('Product Name:', offData.product.product_name);
            } else {
                console.log('Product not found in JSON');
            }
        } catch (e) {
            console.error('Parse Error:', e);
            console.log('Raw Data:', data.substring(0, 200));
        }
    });
});

req.on('error', (e) => console.error('Request Error:', e));
