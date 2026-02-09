try {
    fetch('https://google.com').then(() => console.log('Fetch works')).catch(e => console.log('Fetch failed but exists'));
} catch (e) {
    console.log('Fetch is NOT defined');
}
