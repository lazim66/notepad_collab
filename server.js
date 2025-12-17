import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils.js';

const port = process.env.PORT || 1234;
const wss = new WebSocketServer({ port });

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
});

console.log(`✓ WebSocket server running on port ${port}`);
