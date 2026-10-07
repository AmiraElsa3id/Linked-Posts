import { create } from 'zustand';
import { NotificationItem } from '@/types/api';

interface NotificationState {
  connected: boolean;
  unreadCount: number;
  /** Notifications pushed over the socket since the page loaded (newest first). */
  incoming: NotificationItem[];
  setConnected: (connected: boolean) => void;
  setUnreadCount: (count: number) => void;
  pushIncoming: (notification: NotificationItem) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  connected: false,
  unreadCount: 0,
  incoming: [],
  setConnected: (connected) => set({ connected }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  pushIncoming: (notification) =>
    set((state) =>
      state.incoming.some((n) => n._id === notification._id)
        ? state
        : { incoming: [notification, ...state.incoming] }
    ),
  reset: () => set({ connected: false, unreadCount: 0, incoming: [] }),
}));
