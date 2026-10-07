'use client';

import { Suspense, use } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { Post, User } from '@/types/api';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Users, Bookmark, FileText, Check, UserPlus } from 'lucide-react';
import PostCard from '@/components/PostCard';
import { DEFAULT_PHOTO } from '@/lib/social';
import { useEffect, useState } from 'react';

function ProfileDetailsContent({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  const { token, user: me } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [result, setResult] = useState<{
    token: string;
    profile: User | null;
    posts: Post[];
    error: string | null;
  } | null>(null);

  // Fetch profile and posts in parallel
  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    
    Promise.all([
      apiFetch<{ data: { user: User } }>(`/users/${userId}/profile`, {}, token),
      apiFetch<{ data: { posts?: Post[] } }>(`/users/${userId}/posts?page=1&limit=20`, {}, token),
    ])
      .then(([profileRes, postsRes]) => {
        if (!cancelled) {
          setResult({ 
            token, 
            profile: profileRes.data.user, 
            posts: postsRes.data.posts || [], 
            error: null 
          });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setResult({ token, profile: null, posts: [], error: err.message || 'Failed to load profile' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  const current = token && result?.token === token ? result : null;
  const loading = !current && !!token;
  const error = current?.error ?? null;
  const profile = current?.profile ?? null;
  const posts = current?.posts ?? [];

  const isOwner = !!me && me._id === profile?._id;

  const handleFollow = async () => {
    if (!token || !profile || !me?._id) return;
    const myId = me._id;
    
    // Optimistic update
    setResult((r) => {
      if (!r?.profile) return r;
      const following = r.profile.followers?.some((f) => 
        typeof f === 'object' ? String(f._id) === myId : String(f) === myId
      ) ?? false;
      const newFollowers = following 
        ? (r.profile.followers || []).filter((f) => 
            typeof f === 'object' ? String(f._id) !== myId : String(f) !== myId
          )
        : [...(r.profile.followers || []), myId];
      return {
        ...r,
        profile: {
          ...r.profile,
          followers: newFollowers,
          followersCount: following ? Math.max(0, (r.profile.followersCount || 0) - 1) : (r.profile.followersCount || 0) + 1,
        }
      };
    });
    
    try {
      const res = await apiFetch<{ data?: { following?: boolean } }>(`/users/${userId}/follow`, { method: 'PUT' }, token);
      // Sync with server response
      if (res.data?.following !== undefined) {
        setResult((r) => {
          if (!r?.profile) return r;
          const newFollowers = res.data!.following 
            ? [...(r.profile.followers || []), myId]
            : (r.profile.followers || []).filter((f) => 
                typeof f === 'object' ? String(f._id) !== myId : String(f) !== myId
              );
          return {
            ...r,
            profile: { ...r.profile, followers: newFollowers }
          };
        });
      }
    } catch (err) {
      // Rollback
      setResult((r) => {
        if (!r?.profile) return r;
        const following = r.profile.followers?.some((f) => 
          typeof f === 'object' ? String(f._id) === myId : String(f) === myId
        ) ?? false;
        const newFollowers = following 
          ? [...(r.profile.followers || []), myId]
          : (r.profile.followers || []).filter((f) => 
              typeof f === 'object' ? String(f._id) !== myId : String(f) !== myId
            );
        return {
          ...r,
          profile: {
            ...r.profile,
            followers: newFollowers,
            followersCount: following ? (r.profile.followersCount || 0) + 1 : Math.max(0, (r.profile.followersCount || 0) - 1),
          }
        };
      });
      setResult((r) => r ? { ...r, error: err instanceof Error ? err.message : 'Follow action failed' } : null);
    }
  };

  const following = profile?.followers?.some((f) => 
    typeof f === 'object' ? String(f._id) === String(me?._id) : String(f) === String(me?._id)
  ) ?? false;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-4">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        User not found.
      </div>
    );
  }

  const photo = profile?.photo || DEFAULT_PHOTO;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Cover + Profile Card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-[28px]">
        <div
          className="group/cover relative h-44 bg-[linear-gradient(112deg,#0f172a_0%,#1e3a5f_36%,#2b5178_72%,#5f8fb8_100%)] sm:h-52 lg:h-60"
          style={
            profile?.cover
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.4)), url(${profile.cover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(255,255,255,.14)_0%,rgba(255,255,255,0)_36%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(186,230,253,.22)_0%,rgba(186,230,253,0)_44%)]" />
          <div className="absolute -left-16 top-10 h-36 w-36 rounded-full bg-white/8 blur-3xl" />
          <div className="absolute right-8 top-6 h-48 w-48 rounded-full bg-[#c7e6ff]/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />

          <div className="pointer-events-none absolute right-2 top-2 z-10 flex max-w-[90%] flex-wrap items-center justify-end gap-1.5 opacity-100 transition duration-200 sm:right-3 sm:top-3 sm:max-w-none sm:gap-2 sm:opacity-0 sm:group-hover/cover:opacity-100 sm:group-focus-within/cover:opacity-100">
            {profile?.cover ? (
              <button
                type="button"
                className="pointer-events-auto inline-flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-black/60 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                View cover
              </button>
            ) : null}
            {!isOwner ? null : (
              <label className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-black/60 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                Add cover
                <input type="file" accept="image/*" className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="relative -mt-12 px-3 pb-5 sm:-mt-16 sm:px-8 sm:pb-6">
          <div className="rounded-3xl border border-white/60 bg-white/92 p-5 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-end gap-4">
                  <div className="group/avatar relative shrink-0">
                    <button
                      type="button"
                      className="cursor-zoom-in rounded-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={profile?.name}
                        className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-[#dbeafe] dark:border-slate-900 dark:ring-sky-900"
                      />
                    </button>
                  </div>

                  <div className="min-w-0 pb-1">
                    <h2 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                      {profile?.name}
                    </h2>
                    <p className="mt-1 text-lg font-semibold text-slate-500 dark:text-slate-400 sm:text-xl">
                      @{profile?.username}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d7e7ff] bg-[#eef6ff] px-3 py-1 text-xs font-bold text-[#0b57d0] dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      <Users size={13} />
                      Route Posts member
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid w-full grid-cols-3 gap-2 lg:w-[520px]">
                {[
                  { label: 'Followers', value: profile?.followersCount ?? 0 },
                  { label: 'Following', value: profile?.followingCount ?? 0 },
                  { label: 'Bookmarks', value: profile?.bookmarksCount ?? 0 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-800 dark:bg-slate-800/50 sm:px-4 sm:py-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">About</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2">
                    {profile?.email || 'No email'}
                  </p>
                  <p className="flex items-center gap-2">
                    Active on Route Posts
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  { label: 'My posts', value: posts.length },
                  { label: 'Saved posts', value: 0 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[#dbeafe] bg-[#f6faff] px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/40"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1f4f96] dark:text-sky-300">{stat.label}</p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {!isOwner && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                    following
                      ? 'bg-[#e9f7ef] text-[#1f9d55] dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-[#e7f3ff] text-[#1877f2] hover:bg-[#d8ebff] dark:bg-sky-950 dark:text-sky-400 dark:hover:bg-sky-900'
                  }`}
                  onClick={handleFollow}
                  disabled={false}
                >
                  {following ? (
                    <>
                      <Check size={13} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} />
                      Follow
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs + Post Stream */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 sm:inline-flex sm:w-auto sm:gap-0">
            <button
              onClick={() => setActiveTab('posts')}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeTab === 'posts'
                  ? 'bg-white text-[#1877f2] shadow-sm dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <FileText size={15} />
              My Posts
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeTab === 'saved'
                  ? 'bg-white text-[#1877f2] shadow-sm dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Bookmark size={15} />
              Saved
            </button>
          </div>
          <span className="rounded-full bg-[#e7f3ff] px-3 py-1 text-xs font-bold text-[#1877f2] dark:bg-sky-950 dark:text-sky-400">
            {activeTab === 'posts' ? posts.length : 0}
          </span>
        </div>

        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {activeTab === 'posts' ? 'User has not posted yet.' : 'No saved posts yet.'}
            </p>
          ) : (
            posts.map((post) => (
              <PostCard key={post._id} post={post} currentUserId={me?._id} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
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

          <Suspense fallback={
            <div className="space-y-5">
              <div className="animate-pulse space-y-4">
                <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              </div>
            </div>
          }>
            <ProfileDetailsContent params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}