const { spawn } = require('child_process');
const os = require('os');

// 1. Detect LAN IP
const interfaces = os.networkInterfaces();
let lanIp = 'localhost';

// Prioritize common interface names or non-internal IPv4
for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
        // Skip internal (127.0.0.1) and non-IPv4
        if (iface.family === 'IPv4' && !iface.internal) {
            lanIp = iface.address;
            // If we find a 192.168.x.x or 10.x.x.x, it's likely the one we want
            if (lanIp.startsWith('192.168.') || lanIp.startsWith('10.')) {
                break;
            }
        }
    }
}

console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('\x1b[36m%s\x1b[0m', '   SHOPCOP MOBILE START');
console.log('\x1b[32m%s\x1b[0m', `   Proxy Server: http://localhost:3001`);
console.log('\x1b[32m%s\x1b[0m', `   Web App (LAN): https://${lanIp}:3000`);
console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('Starting services...');

// 2. Start Backend
const server = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

// 3. Start Frontend (Vite)
// --host passed explicitly to ensure it listens on LAN
const vite = spawn('npm', ['run', 'dev', '--', '--host'], { stdio: 'inherit', shell: true });

// Handle Shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.kill();
    vite.kill();
    process.exit();
});
