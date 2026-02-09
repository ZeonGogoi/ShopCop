// No imports needed for Node 22
async function testFetch() {
    const url = 'https://www.walmart.com/search?q=milk';
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Length: ${text.length}`);
        if (text.includes("captcha") || text.includes("blocked")) {
            console.log("Result: Blocked");
        } else {
            console.log("Result: Success (maybe)");
            // Check for price in text
            if (text.includes("$")) {
                console.log("Found dollar sign");
            }
        }
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

testFetch();
