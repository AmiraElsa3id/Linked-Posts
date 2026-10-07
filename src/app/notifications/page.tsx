'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { emitNotificationEvent } from '@/hooks/useNotificationSocket';
import { apiFetch } from '@/lib/api';
import { NotificationItem, NotificationsResponse } from '@/types/api';
import { Bell, CheckCheck, Heart, MessageSquare, UserPlus, Share2, Loader2, Reply, User } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const ACTION_TEXT: Record<string, string> = {
  like_post: 'liked your post',
  comment_post: 'commented on your post',
  share_post: 'shared your post',
  follow_user: 'started following you',
  like_comment: 'liked your comment',
  reply_comment: 'replied to your comment',
};

function actionText(type: string) {
  return ACTION_TEXT[type] ?? type.replace(/_/g, ' ');
}

function NotificationIcon({ type }: { type: string }) {
  if (type.startsWith('like')) return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
  if (type.startsWith('reply')) return <Reply className="w-4 h-4 text-sky-500" />;
  if (type.startsWith('comment')) return <MessageSquare className="w-4 h-4 text-sky-500" />;
  if (type.startsWith('follow')) return <UserPlus className="w-4 h-4 text-emerald-500" />;
  if (type.startsWith('share')) return <Share2 className="w-4 h-4 text-amber-500" />;
  return <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
}

/** Short preview of what the notification is about (post body / comment text). */
function preview(n: NotificationItem) {
  const text =
    n.type === 'comment_post' || n.type === 'reply_comment'
      ? n.entity?.topComment?.content || n.entity?.content
      : n.entity?.body || n.entity?.content;
  if (!text) return null;
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

function postLink(n: NotificationItem) {
  return n.entityType === 'post' && n.entityId ? `/posts/${n.entityId}` : null;
}

export default function NotificationsPage() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const incoming = useNotificationStore((s) => s.incoming);
  const connected = useNotificationStore((s) => s.connected);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  // Result of the last fetch, tagged with the token it was fetched for.
  const [result, setResult] = useState<{
    token: string;
    notifications: NotificationItem[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!hydrated || !token) return;

    let cancelled = false;
    apiFetch<NotificationsResponse>('/notifications?page=1&limit=50', {}, token)
      .then((res) => {
        if (!cancelled) setResult({ token, notifications: res.data?.notifications ?? [], error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ token, notifications: [], error: err.message || 'Failed to load notifications' });
      });

    return () => {
      cancelled = true;
    };
  }, [token, hydrated]);

  const current = token && result?.token === token ? result : null;
  const loading = !hydrated || (!!token && !current);
  const error = current?.error ?? null;
  const notifications = useMemo(() => current?.notifications ?? [], [current]);

  // Live notifications pushed over the socket go on top of the fetched list.
  const allNotifications = useMemo(() => {
    const known = new Set(notifications.map((n) => n._id));
    const live = incoming.filter((n) => !known.has(n._id));
    return [...live, ...notifications].map((n) => (readIds.has(n._id) ? { ...n, isRead: true } : n));
  }, [incoming, notifications, readIds]);

  const unreadInList = allNotifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    setReadIds(new Set(allNotifications.map((n) => n._id)));
    setUnreadCount(0);
    if (!token) return;
    if (emitNotificationEvent(token, 'notifications:read-all')) return;
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' }, token);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const markRead = async (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    if (!token) return;
    if (emitNotificationEvent(token, 'notification:read', { id })) return;
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }, token);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const filteredNotifications = allNotifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950 text-[#002b80] dark:text-sky-400 border border-sky-100 dark:border-sky-800 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`}
                    title={connected ? 'Live updates connected' : 'Live updates offline'}
                  />
                  {connected ? 'Live' : 'Offline'} · Realtime updates for likes, comments, shares, and follows.
                </p>
              </div>
            </div>

            <button
              onClick={markAllRead}
              disabled={unreadInList === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4 text-[#002b80] dark:text-sky-400" />
              <span>Mark all as read</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === f
                    ? 'bg-[#002b80] dark:bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {f === 'all' ? 'All' : `Unread${unreadInList ? ` (${unreadInList})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Stream */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#002b80] dark:text-sky-400 animate-spin" />
          </div>
        ) : !token ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Link href="/auth" className="text-[#002b80] dark:text-sky-400 font-bold">Sign in</Link> to see your notifications.
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-3xl p-10 text-center text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const href = postLink(n);
              const snippet = preview(n);
              const content = (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                        {n.actor?.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={n.actor.photo} alt={n.actor.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-500 dark:text-slate-400 m-2.5" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <NotificationIcon type={n.type} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{n.actor?.name || 'Someone'}</span>{' '}
                        {actionText(n.type)}
                      </p>
                      {snippet && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">“{snippet}”</p>}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-[#002b80] dark:bg-sky-500 flex-shrink-0" />}
                </>
              );

              const className = `p-4 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                n.isRead
                  ? 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  : 'bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800 text-slate-900 dark:text-slate-100 shadow-sm cursor-pointer'
              }`;

              return href ? (
                <Link key={n._id} href={href} onClick={() => !n.isRead && markRead(n._id)} className={className}>
                  {content}
                </Link>
              ) : (
                <div key={n._id} onClick={() => !n.isRead && markRead(n._id)} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        )}
      </main>
    </div>
  );
}
