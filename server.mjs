// Custom Next.js server with a Socket.IO notifications relay.
//
// The Route Posts API (https://route-posts.routemisr.com) only exposes REST
// notification endpoints, so this server keeps one poller per logged-in user
// (shared by all of that user's open tabs) and pushes changes to the browser
// over Socket.IO.
//
// Events emitted to the client:
//   notifications:unread-count  { count }
//   notification:new            NotificationItem (newest first, one per event)
// Events accepted from the client:
//   notifications:refresh       -> poll the API immediately
//   notification:read  { id }   -> PATCH /notifications/:id/read, then refresh
//   notifications:read-all      -> PATCH /notifications/read-all, then refresh

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import next from 'next';
import { Server } from 'socket.io';

const API_URL = 'https://route-posts.routemisr.com';
const POLL_INTERVAL_MS = Number(process.env.NOTIFICATIONS_POLL_MS || 10000);

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production' && !process.argv.includes('--production');
const app = next({ dev });
const handle = app.getRequestHandler();

async function api(endpoint, token, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { token, Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function extractNotifications(res) {
  const list = res?.data?.notifications ?? res?.notifications ?? res?.data;
  return Array.isArray(list) ? list : [];
}

function extractUnreadCount(res) {
  const candidates = [
    res?.data?.unreadCount,
    res?.data?.count,
    res?.unreadCount,
    res?.count,
    typeof res?.data === 'number' ? res.data : undefined,
  ];
  const value = candidates.find((v) => typeof v === 'number');
  return value ?? 0;
}

/** One poller per user token, shared by every socket of that user. */
class UserChannel {
  constructor(io, token, room) {
    this.io = io;
    this.token = token;
    this.room = room;
    this.seenIds = null; // null until the first poll establishes a baseline
    this.unreadCount = null;
    this.timer = null;
    this.polling = false;
  }

  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop() {
    clearInterval(this.timer);
  }

  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const [countRes, listRes] = await Promise.all([
        api('/notifications/unread-count', this.token),
        api('/notifications?page=1&limit=20', this.token),
      ]);

      const count = extractUnreadCount(countRes);
      if (count !== this.unreadCount) {
        this.unreadCount = count;
        this.io.to(this.room).emit('notifications:unread-count', { count });
      }

      const notifications = extractNotifications(listRes);
      if (this.seenIds === null) {
        this.seenIds = new Set(notifications.map((n) => n._id));
      } else {
        const fresh = notifications.filter((n) => n._id && !this.seenIds.has(n._id));
        // Emit oldest first so clients prepending each one end up newest-first.
        for (const n of fresh.reverse()) {
          this.seenIds.add(n._id);
          this.io.to(this.room).emit('notification:new', n);
        }
      }
    } catch (err) {
      if (err.status === 401) {
        this.io.to(this.room).emit('notifications:error', { message: 'unauthorized' });
        this.io.in(this.room).disconnectSockets(true);
      } else {
        console.error('[notifications] poll failed:', err.message);
      }
    } finally {
      this.polling = false;
    }
  }

  /** Re-send the current state to a socket that just joined. */
  sync(socket) {
    if (this.unreadCount !== null) {
      socket.emit('notifications:unread-count', { count: this.unreadCount });
    }
  }
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: '/socket.io' });
  const channels = new Map(); // room -> UserChannel

  io.use((socket, nextFn) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) return nextFn(new Error('unauthorized'));
    socket.data.token = token;
    socket.data.room = `user:${createHash('sha256').update(token).digest('hex')}`;
    nextFn();
  });

  io.on('connection', (socket) => {
    const { token, room } = socket.data;
    socket.join(room);

    let channel = channels.get(room);
    if (!channel) {
      channel = new UserChannel(io, token, room);
      channels.set(room, channel);
      channel.start();
    } else {
      channel.sync(socket);
    }

    socket.on('notifications:refresh', () => channel.poll());

    socket.on('notification:read', async ({ id } = {}) => {
      if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return;
      try {
        await api(`/notifications/${id}/read`, token, { method: 'PATCH' });
      } catch (err) {
        console.error('[notifications] mark read failed:', err.message);
      }
      channel.poll();
    });

    socket.on('notifications:read-all', async () => {
      try {
        await api('/notifications/read-all', token, { method: 'PATCH' });
      } catch (err) {
        console.error('[notifications] mark all read failed:', err.message);
      }
      channel.poll();
    });

    socket.on('disconnect', () => {
      const remaining = io.sockets.adapter.rooms.get(room)?.size ?? 0;
      if (remaining === 0 && channels.get(room) === channel) {
        channel.stop();
        channels.delete(room);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? 'development' : 'production'}) with Socket.IO notifications`);
  });
});
