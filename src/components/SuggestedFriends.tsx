'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserCheck, UserPlus, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { DEFAULT_PHOTO, onAvatarError } from '@/lib/social';
import { SuggestedUser, User } from '@/types/api';

interface UsersResponse {
  data: { suggestions?: SuggestedUser[]; users?: SuggestedUser[] };
}

/**
 * State for the feed's "Suggested Friends" widget.
 * - No search text: GET /users/suggestions
 * - With search text (debounced 300ms): GET /users/search?q=
 * Shows the first 5 results, like the demo.
 */
export function useSuggestedFriends(token: string | null) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ key: string; users: SuggestedUser[] } | null>(null);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  // Debounce the search box.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  // Who am I already following? (search results can include them)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<{ data: { user: User } }>('/users/profile-data', {}, token)
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        (res.data.user.following || []).forEach((id) => (map[String(id)] = true));
        setFollowing((prev) => ({ ...map, ...prev }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const key = `${token}|${query}`;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const path = query
      ? `/users/search?page=1&limit=20&q=${encodeURIComponent(query)}`
      : '/users/suggestions?page=1&limit=20';
    apiFetch<UsersResponse>(path, {}, token)
      .then((res) => {
        if (!cancelled) setResult({ key, users: (query ? res.data.users : res.data.suggestions) || [] });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load suggestions');
        setResult({ key, users: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, key]);

  const users = useMemo(() => (result?.key === key ? result.users.slice(0, 5) : []), [result, key]);
  const loading = !!token && result?.key !== key;

  const toggleFollow = async (userId: string) => {
    if (!token || pending[userId]) return;
    setPending((p) => ({ ...p, [userId]: true }));
    setError('');
    try {
      const res = await apiFetch<{ data?: { following?: boolean } }>(`/users/${userId}/follow`, { method: 'PUT' }, token);
      setFollowing((f) => ({ ...f, [userId]: !!res.data?.following }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Follow failed');
    } finally {
      setPending((p) => ({ ...p, [userId]: false }));
    }
  };

  return { search, setSearch, query, users, loading, following, pending, toggleFollow, error };
}

export type SuggestedFriendsState = ReturnType<typeof useSuggestedFriends>;

export function FollowButton({
  following,
  pending,
  onClick,
  pendingLabel = 'Updating...',
  disabled,
}: {
  following: boolean;
  pending: boolean;
  onClick: () => void;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
        following
          ? 'bg-[#e9f7ef] text-[#1f9d55] dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-[#e7f3ff] text-[#1877f2] hover:bg-[#d8ebff] dark:bg-sky-950 dark:text-sky-400 dark:hover:bg-sky-900'
      }`}
      onClick={onClick}
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          {pendingLabel}
        </>
      ) : following ? (
        <>
          <UserCheck size={13} />
          Following
        </>
      ) : (
        <>
          <UserPlus size={13} />
          Follow
        </>
      )}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  large,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  large?: boolean;
}) {
  return (
    <label className="relative block">
      <Search
        size={large ? 16 : 15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#1877f2] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 ${
          large ? 'py-2.5 pl-10' : 'py-2 pl-9'
        }`}
      />
    </label>
  );
}

export function UserRow({
  user,
  following,
  pending,
  onToggle,
  showStats,
  large,
  pendingLabel,
  lockWhenFollowing,
}: {
  user: SuggestedUser;
  following: boolean;
  pending: boolean;
  onToggle: () => void;
  showStats?: boolean;
  large?: boolean;
  pendingLabel?: string;
  lockWhenFollowing?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 ${large ? 'p-3' : 'p-2.5'}`}>
      <div className={`flex items-center justify-between ${large ? 'gap-3' : 'gap-2'}`}>
        <Link
          href={`/profile/${user._id}`}
          className={`flex min-w-0 items-center rounded-lg px-1 py-1 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
            large ? 'gap-3' : 'gap-2'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.photo || DEFAULT_PHOTO}
            alt={user.name}
            onError={onAvatarError}
            className={`${large ? 'h-12 w-12' : 'h-10 w-10'} shrink-0 rounded-full object-cover`}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 hover:underline dark:text-slate-100">{user.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user.username ? `@${user.username}` : 'route user'}
            </p>
          </div>
        </Link>
        <FollowButton
          following={following}
          pending={pending}
          onClick={onToggle}
          pendingLabel={pendingLabel}
          disabled={lockWhenFollowing && following}
        />
      </div>
      {showStats ? (
        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{user.followersCount ?? 0} followers</span>
          {(user.mutualFollowersCount ?? 0) > 0 ? (
            <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-[#1877f2] dark:bg-sky-950 dark:text-sky-400">
              {user.mutualFollowersCount} mutual
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The "Suggested Friends" card body (desktop right sidebar & mobile panel). */
export function SuggestedFriendsCard({ state, compact }: { state: SuggestedFriendsState; compact?: boolean }) {
  const { search, setSearch, query, users, loading, following, pending, toggleFollow, error } = state;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#1877f2] dark:text-sky-400" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Suggested Friends</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {users.length}
        </span>
      </div>

      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search friends..." />
      </div>

      {error ? (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {query ? 'No users matched your search.' : 'No friend suggestions right now.'}
        </p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow
              key={u._id}
              user={u}
              following={!!following[u._id]}
              pending={!!pending[u._id]}
              onToggle={() => void toggleFollow(u._id)}
              showStats={!compact}
            />
          ))}
        </div>
      )}

      <Link
        href="/suggestions"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        View more
      </Link>
    </div>
  );
}

/** Collapsible version shown above the feed on smaller screens. */
export function MobileSuggestedFriends({ state }: { state: SuggestedFriendsState }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3 xl:hidden">
      <button
        type="button"
        className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
          <Users size={17} className="text-[#1877f2] dark:text-sky-400" />
          Suggested Friends
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {state.users.length}
          </span>
          <span className="text-xs font-bold text-[#1877f2] dark:text-sky-400">{open ? 'Hide' : 'Show'}</span>
        </span>
      </button>
      {open ? <SuggestedFriendsCard state={state} compact /> : null}
    </div>
  );
}
