import WebSocket from 'ws';

const url = 'wss://notepad-collab.onrender.com';

console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('✅ Connection successful!');
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Connection timed out');
  process.exit(1);
}, 30000);
