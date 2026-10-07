import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let socketToken: string | null = null;

/** Returns a shared Socket.IO connection for the given auth token. */
export function getSocket(token: string): Socket {
  if (socket && socketToken === token) return socket;

  socket?.disconnect();
  socketToken = token;
  // Same origin as the Next.js app: served by server.mjs.
  socket = io({ path: '/socket.io', auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
