import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'beebuzz-secret-key-2024';
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3001;

// Maps to keep track of active connections
const userConnections = new Map<string, Set<WebSocket>>();
const loadRooms = new Map<string, Set<WebSocket>>();
const socketToUser = new Map<WebSocket, string>();
const socketToLoads = new Map<WebSocket, Set<string>>();

let wss: WebSocketServer | null = null;

export function initWebSocketServer() {
  try {
    wss = new WebSocketServer({ port: WS_PORT });

    wss.on('connection', (ws: WebSocket, req) => {
      // 1. Authenticate user from query parameter
      const url = new URL(req.url || '', `http://localhost:${WS_PORT}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.warn('[WS] Connection rejected: No token provided.');
        ws.close(4001, 'Unauthorized: No token');
        return;
      }

      let userId: string;
      let role: string;

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        userId = decoded.userId;
        role = decoded.role;
      } catch (err) {
        console.error('[WS] Connection rejected: Token invalid.', err);
        ws.close(4002, 'Unauthorized: Invalid token');
        return;
      }

      console.log(`[WS] User connected: ${userId} (${role})`);

      // Track connection by userId
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(ws);
      socketToUser.set(ws, userId);
      socketToLoads.set(ws, new Set());

      // Send connection acknowledgement
      ws.send(JSON.stringify({ type: 'connected', userId }));

      // 2. Handle incoming messages
      ws.on('message', (messageBuffer) => {
        try {
          const data = JSON.parse(messageBuffer.toString());

          if (data.type === 'subscribe') {
            const loadId = data.loadId;
            if (loadId) {
              // Add to load room
              if (!loadRooms.has(loadId)) {
                loadRooms.set(loadId, new Set());
              }
              loadRooms.get(loadId)!.add(ws);
              socketToLoads.get(ws)!.add(loadId);
              console.log(`[WS] Socket subscribed to load: ${loadId}`);
              ws.send(JSON.stringify({ type: 'subscribed', loadId }));
            }
          }

          if (data.type === 'unsubscribe') {
            const loadId = data.loadId;
            if (loadId) {
              loadRooms.get(loadId)?.delete(ws);
              socketToLoads.get(ws)!.delete(loadId);
              ws.send(JSON.stringify({ type: 'unsubscribed', loadId }));
            }
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      });

      // 3. Handle disconnection
      ws.on('close', () => {
        console.log(`[WS] Connection closed: ${userId}`);
        
        // Remove from userConnections
        const userConns = userConnections.get(userId);
        if (userConns) {
          userConns.delete(ws);
          if (userConns.size === 0) {
            userConnections.delete(userId);
          }
        }

        // Remove from loadRooms
        const joinedLoads = socketToLoads.get(ws);
        if (joinedLoads) {
          joinedLoads.forEach(loadId => {
            loadRooms.get(loadId)?.delete(ws);
          });
        }

        socketToUser.delete(ws);
        socketToLoads.delete(ws);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Socket error for user ${userId}:`, err);
      });
    });

    console.log(`🚀 WebSocket server running on ws://localhost:${WS_PORT}`);
  } catch (error) {
    console.error('Failed to start WebSocket server:', error);
  }
}

/**
 * Send a message directly to a specific user (across all their open connections/tabs)
 */
export function sendToUser(userId: string, data: any) {
  const connections = userConnections.get(userId);
  if (connections && connections.size > 0) {
    const payload = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
    return true;
  }
  return false;
}

/**
 * Broadcast a message to all users subscribed to a specific load
 */
export function broadcastToLoad(loadId: string, data: any) {
  const subscribers = loadRooms.get(loadId);
  if (subscribers && subscribers.size > 0) {
    const payload = JSON.stringify(data);
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
    return true;
  }
  return false;
}

/**
 * Broadcast to all connected clients
 */
export function broadcastAll(data: any) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}
