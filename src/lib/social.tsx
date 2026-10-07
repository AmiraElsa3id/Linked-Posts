import type { ReactNode } from 'react';

/** Default avatar used by the Route Posts API. */
export const DEFAULT_PHOTO = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

/** Highlights @mentions in user text. */
const MENTION_RE = /(^|[\s([{\-.,!?;:])(@[a-zA-Z0-9_]{2,30})/g;
export function renderMentions(text?: string): ReactNode[] | null {
  if (!text) return null;
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

/** Compact relative time: 12s, 5m, 3h, 2d, 4mo, 1y. */
export function relativeTime(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  let r = seconds / 31536000;
  if (r > 1) return `${Math.floor(r)}y`;
  r = seconds / 2592000;
  if (r > 1) return `${Math.floor(r)}mo`;
  r = seconds / 86400;
  if (r > 1) return `${Math.floor(r)}d`;
  r = seconds / 3600;
  if (r > 1) return `${Math.floor(r)}h`;
  r = seconds / 60;
  if (r > 1) return `${Math.floor(r)}m`;
  return `${Math.max(0, Math.floor(seconds))}s`;
}

/** Post header time ("3h"); falls back to "Just now". */
export function postTime(value?: string) {
  if (!value) return 'Just now';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Just now' : relativeTime(d);
}

/** Comment time: relative within a day, otherwise "Oct 7, 3:07 AM". */
export function commentTime(value?: string) {
  if (!value) return 'just now';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'just now';
  return Math.floor((Date.now() - d.getTime()) / 1000) < 86400
    ? relativeTime(d)
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Swap a broken avatar image for the default one. */
export function onAvatarError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null;
  if (img.src !== DEFAULT_PHOTO) img.src = DEFAULT_PHOTO;
}
