const https = require('https');

const url = 'https://skillswap-backend-lgr8.onrender.com/api/skills';
console.log('Testing:', url);
console.log('Waiting for Render to wake up (may take up to 60s on free tier)...');

const req = https.get(url, { timeout: 180000 }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
    process.exit(0);
  });
});

req.on('timeout', () => { console.log('TIMEOUT'); req.destroy(); process.exit(1); });
req.on('error', e => { console.error('Error:', e.message); process.exit(1); });
