'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { disconnectSocket, getSocket } from '@/lib/socket';
import { NotificationItem } from '@/types/api';

/**
 * Connects to the Socket.IO notifications relay while the user is logged in
 * and keeps the notification store in sync. Mount once (in the Header).
 */
export function useNotificationSocket() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const { setConnected, setUnreadCount, pushIncoming, reset } = useNotificationStore.getState();

    if (!token) {
      disconnectSocket();
      reset();
      return;
    }

    const socket = getSocket(token);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onCount = ({ count }: { count: number }) => setUnreadCount(count);
    const onNew = (n: NotificationItem) => pushIncoming(n);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notifications:unread-count', onCount);
    socket.on('notification:new', onNew);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notifications:unread-count', onCount);
      socket.off('notification:new', onNew);
    };
  }, [token]);
}

/** Helpers for emitting notification actions over the socket. */
export function emitNotificationEvent(
  token: string | null,
  event: 'notifications:refresh' | 'notifications:read-all' | 'notification:read',
  payload?: { id: string }
) {
  if (!token) return false;
  const socket = getSocket(token);
  if (!socket.connected) return false;
  socket.emit(event, payload);
  return true;
}
