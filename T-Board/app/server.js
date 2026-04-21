const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

app.use('/api', require('./api/get'));
app.use('/api', require('./api/post'));
app.use('/api', require('./api/patch'));
app.use('/api', require('./api/delete'));

const clients = new Set();

wss.on('connection', (ws) => {
  const client = { ws, boardId: null };
  clients.add(client);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'subscribe' && msg.boardId) {
        client.boardId = msg.boardId;
      }
    } catch (e) {}
  });

  ws.on('close', () => clients.delete(client));
});

function broadcast(boardId, event, data) {
  const payload = JSON.stringify({ event, data });
  clients.forEach(client => {
    if (client.boardId == boardId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}

global.broadcast = broadcast;
global.db = require('./db/db');

const PORT = 8010;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен — http://localhost:${PORT}`);
});