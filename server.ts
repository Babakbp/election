import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '15mb' }));

// Helper to get local network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const k in interfaces) {
    for (const addr of interfaces[k] || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }
  return addresses;
}

// In-memory election state cache on server
let cachedElectionState: any = null;

// Track active WebSocket clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket, req) => {
  clients.add(ws);
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] Client connected (${clients.size} total active clients) from ${clientIp}`);

  // Send initial cached state if available
  if (cachedElectionState) {
    ws.send(
      JSON.stringify({
        type: 'FULL_STATE_SYNC',
        senderId: 'server',
        senderRole: 'server',
        senderName: 'سرور محلی انتخابات',
        timestamp: new Date().toISOString(),
        payload: cachedElectionState,
      })
    );
  }

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      // If master sent full state update, cache it on server
      if (msg.type === 'FULL_STATE_SYNC' && msg.payload) {
        cachedElectionState = msg.payload;
      }

      // If client requests full state, reply with cached state
      if (msg.type === 'REQUEST_FULL_STATE') {
        if (cachedElectionState) {
          ws.send(
            JSON.stringify({
              type: 'FULL_STATE_SYNC',
              senderId: 'server',
              senderRole: 'server',
              senderName: 'سرور محلی انتخابات',
              timestamp: new Date().toISOString(),
              payload: cachedElectionState,
            })
          );
        }
      }

      // Broadcast to all other connected clients
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      }
    } catch (e) {
      console.warn('Error handling WS message', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected (${clients.size} active clients remaining)`);
  });

  ws.on('error', (err) => {
    console.warn('[WebSocket] Error on client connection', err);
    clients.delete(ws);
  });
});

// Network information endpoint
app.get('/api/network/info', (req, res) => {
  const ips = getLocalIpAddresses();
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol;
  res.json({
    localIps: ips,
    primaryIp: ips[0] || 'localhost',
    port: 3000,
    currentHost: host,
    connectedClientsCount: clients.size,
    isServerActive: true,
  });
});

// In-memory queue of votes to guarantee synchronization across all devices
const recentVotesQueue: Array<{
  id: string;
  candidateIds: string[];
  voterId?: string;
  source: string;
  stationName: string;
  timestamp: string;
}> = [];

// Voting API endpoint for reliable mobile phone & kiosk vote submission
app.post('/api/sync/vote', (req, res) => {
  const { candidateIds, voterId, source = 'mobile', stationName = 'گوشی همراه رأی‌دهنده' } = req.body;
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return res.status(400).json({ error: 'candidateIds array is required' });
  }

  const voteEvent = {
    id: 'vote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    candidateIds,
    voterId,
    source,
    stationName,
    timestamp: new Date().toISOString(),
  };

  recentVotesQueue.push(voteEvent);
  // Keep last 100 votes in memory
  if (recentVotesQueue.length > 100) {
    recentVotesQueue.shift();
  }

  // Update cached election state if available
  if (cachedElectionState && Array.isArray(cachedElectionState.candidates)) {
    cachedElectionState.candidates = cachedElectionState.candidates.map((c: any) =>
      candidateIds.includes(c.id) ? { ...c, votes: (c.votes || 0) + 1 } : c
    );

    if (voterId && Array.isArray(cachedElectionState.voters)) {
      cachedElectionState.voters = cachedElectionState.voters.map((v: any) =>
        v.id === voterId ? { ...v, hasVoted: true, votedAt: new Date().toLocaleTimeString('fa-IR') } : v
      );
    }
  }

  // Broadcast to all active WebSocket clients (including Master panel)
  const broadcastMsg = JSON.stringify({
    type: 'KIOSK_MULTIPLE_VOTES_CAST',
    senderId: 'server_api',
    senderRole: 'kiosk',
    senderName: stationName,
    timestamp: voteEvent.timestamp,
    payload: {
      voteId: voteEvent.id,
      candidateIds,
      voterId,
      source,
    },
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(broadcastMsg);
      } catch (e) {
        console.warn('Error broadcasting vote over WS', e);
      }
    }
  }

  console.log(`[API Vote] Successfully processed vote for ${candidateIds.length} candidate(s) from ${source} (${stationName})`);
  return res.json({ success: true, voteId: voteEvent.id, timestamp: voteEvent.timestamp });
});

// Endpoint for master to pull any missed votes since a specific time
app.get('/api/sync/pending-votes', (req, res) => {
  const since = req.query.since as string;
  if (!since) {
    return res.json({ votes: recentVotesQueue });
  }
  const filtered = recentVotesQueue.filter(v => v.timestamp > since);
  return res.json({ votes: filtered });
});

// State API endpoints for full state synchronization across all connected devices
app.get('/api/sync/state', (_req, res) => {
  res.json({
    hasState: !!cachedElectionState,
    state: cachedElectionState,
  });
});

app.post('/api/sync/state', (req, res) => {
  cachedElectionState = req.body;
  // Broadcast to WS clients
  const broadcastMsg = JSON.stringify({
    type: 'FULL_STATE_SYNC',
    senderId: 'server_rest',
    senderRole: 'master',
    senderName: 'سرور مرکزی',
    timestamp: new Date().toISOString(),
    payload: cachedElectionState,
  });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(broadcastMsg);
      } catch (e) {
        console.warn('Error broadcasting state to client', e);
      }
    }
  }
  res.json({ success: true, timestamp: new Date().toISOString() });
});


// Configure Vite middleware in development, or static in production
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    console.log(`===================================================`);
    console.log(`🚀 سرور انتخابات و وب‌سوکت روی پورت ${PORT} فعال شد`);
    console.log(`🌐 دسترسی محلی روی این سیستم: http://localhost:${PORT}`);
    if (ips.length > 0) {
      console.log(`📶 دسترسی لپ‌تاپ‌ها و تبلت‌های دیگر در شبکه وای‌فای:`);
      ips.forEach((ip) => {
        console.log(`   ➜ http://${ip}:${PORT}`);
      });
    }
    console.log(`===================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
