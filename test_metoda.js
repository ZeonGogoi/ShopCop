const axios = require('axios');

const API_KEY = 'MKMRYDUCFPVFLUVJXFKOOSMNZKEYUTPNYOJOFLHVEXPUNZIFHVWBXSHBVMUXQFVY';
const BARCODE = '075720481279'; // Poland Spring Water

async function testMetoda() {
    console.log('Testing Metoda Price API...');

    try {
        // 1. Create Job
        console.log('1. Creating Job...');
        const jobResponse = await axios.post('https://api.priceapi.com/v2/jobs', {
            token: API_KEY,
            country: 'us',
            topic: 'product_and_offers',
            source: 'google_shopping',
            key: 'gtin',
            values: '0' + BARCODE // Try GTIN-13 (padded)
        });

        const jobId = jobResponse.data.job_id;
        console.log(`   Job Created! ID: ${jobId}`);

        // 2. Poll Status
        console.log('2. Polling for results...');
        let status = 'working';

        // Timeout after 60s
        const startTime = Date.now();

        while (status === 'working' || status === 'pending') {
            if (Date.now() - startTime > 60000) {
                throw new Error('Timeout waiting for job');
            }

            await new Promise(r => setTimeout(r, 2000)); // Wait 2s

            const statusUrl = `https://api.priceapi.com/v2/jobs/${jobId}?token=${API_KEY}`;
            const statusRes = await axios.get(statusUrl);

            status = statusRes.data.status;
            console.log(`   Status: ${status} (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }

        if (status === 'finished') {
            // 3. Download Results
            console.log('3. Downloading Data...');
            const downloadUrl = `https://api.priceapi.com/v2/jobs/${jobId}/download.json?token=${API_KEY}`;
            const downloadRes = await axios.get(downloadUrl);

            const results = downloadRes.data.results;
            if (results && results.length > 0) {
                const product = results[0];
                console.log('FULL DATA:', JSON.stringify(product, null, 2));
            } else {
                console.log('Job finished but no results found.');
            }

        } else {
            console.error('Job failed or cancelled.');
        }

    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testMetoda();
