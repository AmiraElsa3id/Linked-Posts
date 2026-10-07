'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiFetch } from '@/lib/api';
import { Pagination, SuggestedUser } from '@/types/api';
import { SearchInput, UserRow } from '@/components/SuggestedFriends';

const PAGE_SIZE = 20;

interface SuggestionsResponse {
  data: { suggestions?: SuggestedUser[] };
  meta?: { pagination?: Pagination };
}

interface ListState {
  key: string;
  users: SuggestedUser[];
  nextPage: number | null;
}

/** All Suggested Friends: GET /users/suggestions?page=&limit=20&q= with "Load more". */
export default function SuggestionsPage() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [list, setList] = useState<ListState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const fetchPage = (page: number, q: string, t: string) =>
    apiFetch<SuggestionsResponse>(
      `/users/suggestions?page=${page}&limit=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      {},
      t
    ).then((res) => {
      const users = res.data.suggestions || [];
      const next = res.meta?.pagination?.nextPage ?? (users.length === PAGE_SIZE ? page + 1 : null);
      return { users, nextPage: next };
    });

  const key = `${token}|${query}`;
  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    fetchPage(1, query, token)
      .then(({ users, nextPage }) => !cancelled && setList({ key, users, nextPage }))
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load suggestions');
        setList({ key, users: [], nextPage: null });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, query, key]);

  const current = list?.key === key ? list : null;
  const users = current?.users ?? [];
  const loading = !hydrated || (!!token && !current);

  const loadMore = async () => {
    if (!token || !current?.nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const { users: more, nextPage } = await fetchPage(current.nextPage, query, token);
      setList((prev) => {
        if (!prev || prev.key !== key) return prev;
        const seen = new Set(prev.users.map((u) => u._id));
        return { key, users: [...prev.users, ...more.filter((u) => !seen.has(u._id))], nextPage };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more users');
    } finally {
      setLoadingMore(false);
    }
  };

  const follow = async (userId: string) => {
    if (!token || pending[userId] || followed[userId]) return;
    setError('');
    setPending((p) => ({ ...p, [userId]: true }));
    try {
      await apiFetch(`/users/${userId}/follow`, { method: 'PUT' }, token);
      setFollowed((f) => ({ ...f, [userId]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Follow failed');
    } finally {
      setPending((p) => ({ ...p, [userId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
      <Header />
      <div className="mx-auto max-w-7xl px-3 py-3.5">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
            Back to feed
          </Link>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#1877f2] dark:text-sky-400" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">All Suggested Friends</h1>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {users.length}
              </span>
            </div>

            <div className="mb-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name or username..." large />
            </div>

            {error ? (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
                {error}
              </div>
            ) : null}

            {hydrated && !token ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <Link href="/auth" className="font-bold text-[#1877f2] dark:text-sky-400">
                  Sign in
                </Link>{' '}
                to see friend suggestions.
              </p>
            ) : loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No users matched your search.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {users.map((u) => (
                  <UserRow
                    key={u._id}
                    user={u}
                    following={!!followed[u._id]}
                    pending={!!pending[u._id]}
                    onToggle={() => void follow(u._id)}
                    showStats
                    large
                    pendingLabel="Follow..."
                    lockWhenFollowing
                  />
                ))}
              </div>
            )}

            {current?.nextPage ? (
              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load more users'
                )}
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
