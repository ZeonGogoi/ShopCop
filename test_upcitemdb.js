const axios = require('axios');

async function testUPCItemDB() {
    const barcode = '075720481279'; // Poland Spring Water
    // const barcode = '049000028904'; // Sprite (Common item)

    console.log(`Testing UPCItemDB Trial API for: ${barcode}`);

    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;

    try {
        const response = await axios.get(url);
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        const items = response.data.items;
        if (items && items.length > 0) {
            const item = items[0];
            console.log('Title:', item.title);
            console.log('Lowest Price:', item.lowest_recorded_price);
            console.log('Highest Price:', item.highest_recorded_price);
            // Check offers
            if (item.offers && item.offers.length > 0) {
                console.log('Offers found:', item.offers.length);
                item.offers.forEach(offer => {
                    console.log(`- ${offer.merchant}: $${offer.price}`);
                });
            } else {
                console.log('No specific offers listed.');
            }
        } else {
            console.log('Item not found in DB.');
        }

    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Response Body:', error.response.data);
        }
    }
}

testUPCItemDB();
