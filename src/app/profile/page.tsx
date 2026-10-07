'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { apiFetch } from '@/lib/api';
import { Post, User } from '@/types/api';
import {
  Bookmark,
  Camera,
  Clock3,
  Expand,
  FileText,
  Mail,
  MessageCircle,
  Repeat2,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';
/** Size (px) of the square crop viewport in the "Adjust profile photo" dialog. */
const CROP_SIZE = 320;
/** Size (px) of the exported square profile photo. */
const OUTPUT_SIZE = 720;

type Privacy = 'public' | 'following' | 'only_me';
type Tab = 'posts' | 'saved';

interface CropState {
  src: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
}

interface ProfileResponse {
  data: { user: User };
}
interface PostsResponse {
  data: { posts?: Post[] };
}
interface BookmarksResponse {
  data: { bookmarks?: Post[] };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatDate = (value?: string) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Just now'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** Highlights @mentions in post text. */
const MENTION_RE = /(^|[\s([{\-.,!?;:])(@[a-zA-Z0-9_]{2,30})/g;
function renderMentions(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  MENTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(text)) !== null) {
    const prefix = match[1] || '';
    const mention = match[2] || '';
    const start = match.index + prefix.length;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <span key={`mention-${key++}`} className="font-bold text-[#1877f2] dark:text-sky-400">
        {mention}
      </span>
    );
    last = start + mention.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

const getImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

/** Renders the visible crop area to a square OUTPUT_SIZE image file. */
async function exportCroppedImage(crop: CropState, zoom: number, position: { x: number; y: number }) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to process image'));
    el.src = crop.src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image context not available');

  const scale = Math.max(CROP_SIZE / crop.width, CROP_SIZE / crop.height) * zoom;
  const left = CROP_SIZE / 2 - (crop.width * scale) / 2 + position.x;
  const top = CROP_SIZE / 2 - (crop.height * scale) / 2 + position.y;
  const sourceSize = CROP_SIZE / scale;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -left / scale, -top / scale, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to export image'))),
      crop.mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
      0.95
    );
  });
  return new File([blob], crop.fileName || `profile-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
}

function clampPosition(pos: { x: number; y: number }, crop: CropState | null, zoom: number) {
  if (!crop) return { x: 0, y: 0 };
  const scale = Math.max(CROP_SIZE / crop.width, CROP_SIZE / crop.height) * zoom;
  const maxX = Math.max(0, (crop.width * scale - CROP_SIZE) / 2);
  const maxY = Math.max(0, (crop.height * scale - CROP_SIZE) / 2);
  return { x: clamp(pos.x, -maxX, maxX), y: clamp(pos.y, -maxY, maxY) };
}

const PRIVACY_OPTIONS = (
  <>
    <option value="public">Public</option>
    <option value="following">Followers</option>
    <option value="only_me">Only me</option>
  </>
);

const coverButtonClass =
  'pointer-events-auto inline-flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs';
const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#1877f2] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500';
const cancelButtonClass =
  'inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';
const primaryButtonClass =
  'inline-flex items-center rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500';

export default function ProfilePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const storedUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [me, setMe] = useState<User | null>(null);
  const [lists, setLists] = useState<{ token: string; myPosts: Post[]; bookmarks: Post[] } | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('posts');

  // Full-screen image viewer
  const [viewer, setViewer] = useState<{ src: string; alt: string } | null>(null);

  // Profile photo crop dialog
  const [crop, setCrop] = useState<CropState | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoPrivacy, setPhotoPrivacy] = useState<Privacy>('public');
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  // Cover dialog
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPrivacy, setCoverPrivacy] = useState<Privacy>('public');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverRemoving, setCoverRemoving] = useState(false);

  const user = me ?? storedUser;

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<ProfileResponse>('/users/profile-data', {}, token);
      setMe(res.data.user);
      // Keep the header avatar/name in sync.
      updateUser({ name: res.data.user.name, photo: res.data.user.photo, username: res.data.user.username });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    }
  }, [token, updateUser]);

  const loadLists = useCallback(async () => {
    if (!token) return;
    try {
      const [posts, saved] = await Promise.all([
        apiFetch<PostsResponse>('/posts/feed?only=me&page=1&limit=20', {}, token),
        apiFetch<BookmarksResponse>('/users/bookmarks?page=1&limit=20', {}, token),
      ]);
      setLists({ token, myPosts: posts.data.posts || [], bookmarks: saved.data.bookmarks || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      setLists({ token, myPosts: [], bookmarks: [] });
    }
  }, [token]);

  // Initial load: profile, my posts and bookmarks in parallel (same calls as the demo).
  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;

    apiFetch<ProfileResponse>('/users/profile-data', {}, token)
      .then((res) => {
        if (cancelled) return;
        setMe(res.data.user);
        updateUser({ name: res.data.user.name, photo: res.data.user.photo, username: res.data.user.username });
      })
      .catch((err: Error) => !cancelled && setError(err.message || 'Failed to refresh profile'));

    Promise.all([
      apiFetch<PostsResponse>('/posts/feed?only=me&page=1&limit=20', {}, token),
      apiFetch<BookmarksResponse>('/users/bookmarks?page=1&limit=20', {}, token),
    ])
      .then(([posts, saved]) => {
        if (!cancelled) setLists({ token, myPosts: posts.data.posts || [], bookmarks: saved.data.bookmarks || [] });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load posts');
        setLists({ token, myPosts: [], bookmarks: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, updateUser]);

  // Esc closes any open overlay; lock page scroll while one is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewer(null);
        setCrop(null);
        setCoverFile(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = viewer || crop || coverFile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewer, crop, coverFile]);

  const current = lists && lists.token === token ? lists : null;
  const myPosts = current?.myPosts ?? [];
  const bookmarks = current?.bookmarks ?? [];
  const loading = !hydrated || (!!token && !current);
  const visiblePosts = tab === 'posts' ? myPosts : bookmarks;

  // ---- Profile photo ----
  const onPhotoSelected = async (file: File | null) => {
    if (!file) return;
    try {
      const src = await readFileAsDataUrl(file);
      const size = await getImageSize(src);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setCrop({ src, fileName: file.name, mimeType: file.type || 'image/jpeg', ...size });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read image');
    }
  };

  const onZoomChange = (value: number) => {
    setZoom(value);
    setPosition((p) => clampPosition(p, crop, value));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, originX: position.x, originY: position.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPosition(
      clampPosition({ x: drag.originX + e.clientX - drag.x, y: drag.originY + e.clientY - drag.y }, crop, zoom)
    );
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const savePhoto = async () => {
    if (!crop || savingPhoto || !token) return;
    setSavingPhoto(true);
    setError('');
    try {
      const file = await exportCroppedImage(crop, zoom, position);
      const form = new FormData();
      form.set('photo', file);
      form.set('privacy', photoPrivacy);
      await apiFetch('/users/upload-photo', { method: 'PUT', body: form }, token);
      await Promise.all([refreshMe(), loadLists()]);
      setCrop(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSavingPhoto(false);
    }
  };

  // ---- Cover photo ----
  const saveCover = async () => {
    if (!coverFile || !token) return;
    setCoverUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.set('cover', coverFile);
      form.set('privacy', coverPrivacy);
      await apiFetch('/users/upload-cover', { method: 'PUT', body: form }, token);
      await Promise.all([refreshMe(), loadLists()]);
      setCoverFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover upload failed');
    } finally {
      setCoverUploading(false);
    }
  };

  const removeCover = async () => {
    if (!token) return;
    setCoverRemoving(true);
    setError('');
    try {
      await apiFetch('/users/cover', { method: 'DELETE' }, token);
      await Promise.all([refreshMe(), loadLists()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover delete failed');
    } finally {
      setCoverRemoving(false);
    }
  };

  const photo = user?.photo || DEFAULT_PHOTO;
  const cropScale = crop ? Math.max(CROP_SIZE / crop.width, CROP_SIZE / crop.height) * zoom : 1;

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
      <Header />

      <div className="mx-auto max-w-7xl px-3 py-3.5">
        <main className="min-w-0">
          {hydrated && !token ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Link href="/auth" className="font-bold text-[#1877f2] dark:text-sky-400">
                Sign in
              </Link>{' '}
              to view your profile.
            </p>
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {/* Cover + profile card */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-[28px]">
                <div
                  className="group/cover relative h-44 bg-[linear-gradient(112deg,#0f172a_0%,#1e3a5f_36%,#2b5178_72%,#5f8fb8_100%)] sm:h-52 lg:h-60"
                  style={
                    user?.cover
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.4)), url(${user.cover})`,
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
                    {user?.cover ? (
                      <button
                        type="button"
                        className={coverButtonClass}
                        onClick={() => setViewer({ src: user.cover!, alt: `${user.name || 'User'} cover photo` })}
                      >
                        <Expand size={13} />
                        View cover
                      </button>
                    ) : null}
                    <label className={`${coverButtonClass} cursor-pointer`}>
                      <Camera size={13} />
                      {coverUploading ? 'Uploading...' : user?.cover ? 'Change cover' : 'Add cover'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setCoverFile(e.target.files?.[0] || null);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {user?.cover ? (
                      <button type="button" className={coverButtonClass} onClick={removeCover} disabled={coverRemoving}>
                        <Trash2 size={13} />
                        {coverRemoving ? 'Removing...' : 'Remove'}
                      </button>
                    ) : null}
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
                              onClick={() => setViewer({ src: photo, alt: `${user?.name || 'User'} profile photo` })}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo}
                                alt={user?.name}
                                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-[#dbeafe] dark:border-slate-900 dark:ring-sky-900"
                              />
                            </button>
                            <button
                              type="button"
                              className="absolute bottom-1 left-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-[#1877f2] opacity-100 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-sky-400 dark:ring-slate-700 dark:hover:bg-slate-700 sm:opacity-0 sm:group-hover/avatar:opacity-100 sm:group-focus-within/avatar:opacity-100"
                              onClick={() => setViewer({ src: photo, alt: `${user?.name || 'User'} profile photo` })}
                              title="View profile photo"
                              aria-label="View profile photo"
                            >
                              <Expand size={16} />
                            </button>
                            <label
                              className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#1877f2] text-white opacity-100 shadow-sm transition duration-200 hover:bg-[#166fe5] dark:bg-sky-600 dark:hover:bg-sky-500 sm:opacity-0 sm:group-hover/avatar:opacity-100 sm:group-focus-within/avatar:opacity-100"
                              title="Change profile photo"
                            >
                              <Camera size={17} />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  void onPhotoSelected(e.target.files?.[0] || null);
                                  e.currentTarget.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <div className="min-w-0 pb-1">
                            <h2 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                              {user?.name}
                            </h2>
                            <p className="mt-1 text-lg font-semibold text-slate-500 dark:text-slate-400 sm:text-xl">
                              @{user?.username}
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
                          { label: 'Followers', value: user?.followersCount ?? 0 },
                          { label: 'Following', value: user?.followingCount ?? 0 },
                          { label: 'Bookmarks', value: user?.bookmarksCount ?? 0 },
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
                            <Mail size={15} className="text-slate-500 dark:text-slate-400" />
                            {user?.email || 'No email'}
                          </p>
                          <p className="flex items-center gap-2">
                            <Users size={15} className="text-slate-500 dark:text-slate-400" />
                            Active on Route Posts
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {[
                          { label: 'My posts', value: myPosts.length },
                          { label: 'Saved posts', value: bookmarks.length },
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
                  </div>
                </div>
              </section>

              {error && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
                  {error}
                </div>
              )}

              {/* Tabs + posts */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800 sm:inline-flex sm:w-auto sm:gap-0">
                    {(
                      [
                        { id: 'posts', label: 'My Posts', icon: <FileText size={15} /> },
                        { id: 'saved', label: 'Saved', icon: <Bookmark size={15} /> },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                          tab === t.id
                            ? 'bg-white text-[#1877f2] shadow-sm dark:bg-slate-900 dark:text-sky-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                        }`}
                      >
                        {t.icon}
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <span className="rounded-full bg-[#e7f3ff] px-3 py-1 text-xs font-bold text-[#1877f2] dark:bg-sky-950 dark:text-sky-400">
                    {visiblePosts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <>
                      <div className="h-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                      <div className="h-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                    </>
                  ) : visiblePosts.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      {tab === 'posts' ? 'You have not posted yet.' : 'No saved posts yet.'}
                    </p>
                  ) : (
                    visiblePosts.map((post) => (
                      <article
                        key={post._id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_6px_rgba(15,23,42,.05)] transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.user?.photo || DEFAULT_PHOTO}
                                alt={post.user?.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                                  {post.user?.name || user?.name}
                                </p>
                                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  {post.user?.username ? `@${post.user.username}` : '@route'}
                                </p>
                              </div>
                            </div>
                            <button
                              className="rounded-md px-2 py-1 text-xs font-bold text-[#1877f2] transition hover:bg-[#e7f3ff] dark:text-sky-400 dark:hover:bg-sky-950"
                              onClick={() => router.push(`/posts/${post._id}`)}
                            >
                              View details
                            </button>
                          </div>
                          <div className="pt-3">
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
                              {post.body ? renderMentions(post.body) : 'No text content'}
                            </p>
                          </div>
                        </div>

                        {post.image ? (
                          <div className="border-y border-slate-200 bg-slate-950/95 dark:border-slate-800">
                            <button
                              type="button"
                              className="group relative flex w-full cursor-zoom-in items-center justify-center"
                              onClick={() => setViewer({ src: post.image!, alt: `${post.user?.name || 'user'} post image` })}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={post.image} alt="post" className="max-h-[560px] w-auto max-w-full object-contain" />
                              <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                            </button>
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <ThumbsUp size={14} className="text-[#1877f2] dark:text-sky-400" />
                              {post.likesCount ?? post.likes?.length ?? 0} likes
                            </span>
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <Repeat2 size={14} className="text-[#1877f2] dark:text-sky-400" />
                              {post.sharesCount ?? 0} shares
                            </span>
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <MessageCircle size={14} className="text-[#1877f2] dark:text-sky-400" />
                              {post.commentsCount ?? post.comments?.length ?? 0} comments
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <Clock3 size={13} />
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Full-screen image viewer */}
      {viewer ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={() => setViewer(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setViewer(null)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewer.src}
            alt={viewer.alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {/* Adjust profile photo */}
      {crop ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={() => setCrop(null)}>
          <div
            className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Adjust profile photo</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Drag to reposition and use zoom for perfect framing.</p>
            </div>

            <div className="mx-auto w-full max-w-[340px] overflow-x-auto pb-1">
              <div
                className="relative h-[320px] w-[320px] touch-none overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={crop.src}
                  alt="Crop preview"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                  style={{
                    width: `${crop.width}px`,
                    height: `${crop.height}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${cropScale})`,
                    transformOrigin: 'center',
                  }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Zoom</span>
                <span>{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#1877f2] dark:bg-slate-700"
              />
            </div>

            <div className="mt-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Post privacy</p>
              <select value={photoPrivacy} onChange={(e) => setPhotoPrivacy(e.target.value as Privacy)} className={selectClass}>
                {PRIVACY_OPTIONS}
              </select>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className={cancelButtonClass} onClick={() => setCrop(null)} disabled={savingPhoto}>
                Cancel
              </button>
              <button type="button" className={primaryButtonClass} onClick={() => void savePhoto()} disabled={savingPhoto}>
                {savingPhoto ? 'Saving...' : 'Save photo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cover post privacy */}
      {coverFile ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={() => setCoverFile(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Cover post privacy</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose who can see the post generated for your new cover photo.
            </p>
            <div className="mt-4">
              <select value={coverPrivacy} onChange={(e) => setCoverPrivacy(e.target.value as Privacy)} className={selectClass}>
                {PRIVACY_OPTIONS}
              </select>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" className={cancelButtonClass} onClick={() => setCoverFile(null)} disabled={coverUploading}>
                Cancel
              </button>
              <button type="button" className={primaryButtonClass} onClick={() => void saveCover()} disabled={coverUploading}>
                {coverUploading ? 'Saving...' : 'Save cover'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
