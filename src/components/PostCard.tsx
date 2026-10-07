'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  ChevronDown,
  Edit3,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { apiFetch } from '@/lib/api';
import { commentTime, DEFAULT_PHOTO, onAvatarError, postTime, renderMentions } from '@/lib/social';
import { useAuthStore } from '@/store/authStore';
import { Comment, Pagination, Post } from '@/types/api';

const COMMENTS_PAGE = 5;
const REPLIES_PAGE = 10;
const MAX_COMMENT_LENGTH = 300;

interface CommentsResponse {
  data: { comments?: Comment[] };
  meta?: { pagination?: Pagination };
}
interface RepliesResponse {
  data: { replies?: Comment[] };
}

const inputClass =
  'w-full rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1877f2] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500';
const smallPrimary =
  'rounded-full bg-[#1877f2] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#166fe5] disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500';
const smallCancel =
  'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

function PostActionButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:text-sm ${
        active
          ? 'bg-[#e7f3ff] text-[#1877f2] dark:bg-sky-950 dark:text-sky-400'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  confirmPendingLabel: string;
  onConfirm: () => Promise<void> | void;
}

export default function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.user);
  const myPhoto = me?.photo || DEFAULT_PHOTO;

  const isOwner = !!currentUserId && String(post.user?._id) === String(currentUserId);
  const [privacy, setPrivacy] = useState(post.privacy?.toLowerCase() || 'public');
  const privacyLabel = privacy === 'only_me' ? 'Only me' : privacy === 'following' ? 'Followers' : privacy === 'private' ? 'Only me' : privacy === 'group' ? 'Group' : 'Public';
  const PrivacyIcon = privacy === 'only_me' || privacy === 'private' ? Lock : privacy === 'following' || privacy === 'group' ? Users : Globe;

  // --- Header / post actions ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [privacyMenuOpen, setPrivacyMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.body || '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirming, setConfirming] = useState(false);

  // --- Reactions ---
  const [liked, setLiked] = useState(() =>
    currentUserId ? (post.likes || []).some((id) => String(id) === String(currentUserId)) : false
  );
  const [likesCount, setLikesCount] = useState(post.likesCount ?? post.likes?.length ?? 0);
  const [liking, setLiking] = useState(false);
  const [saved, setSaved] = useState(() =>
    post.bookmarked ?? (currentUserId ? (post.bookmarks || []).some((id) => String(id) === String(currentUserId)) : false)
  );
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [sharing, setSharing] = useState(false);

  // --- Comments ---
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [serverComments, setServerComments] = useState<Comment[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tempComments, setTempComments] = useState<Comment[]>([]);
  const [countOverride, setCountOverride] = useState<number | null>(null);
  const [sort, setSort] = useState<'relevant' | 'newest'>('relevant');
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [repliesOpen, setRepliesOpen] = useState<Record<string, boolean>>({});
  const [repliesLoading, setRepliesLoading] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyImage, setReplyImage] = useState<Record<string, File | null>>({});
  const [replyPreview, setReplyPreview] = useState<Record<string, string | null>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; likesCount: number }>>({});
  const [likingComment, setLikingComment] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<Record<string, string>>({});
  const [savingEditComment, setSavingEditComment] = useState<Record<string, boolean>>({});
  const [deletingComment, setDeletingComment] = useState<Record<string, boolean>>({});
  const [menuOpenComment, setMenuOpenComment] = useState<Record<string, boolean>>({});
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!menuOpen && !privacyMenuOpen && !Object.values(menuOpenComment).some(Boolean)) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (privacyRef.current && !privacyRef.current.contains(target)) setPrivacyMenuOpen(false);
      if (!(target as Element).closest?.('[data-comment-menu-root]')) setMenuOpenComment({});
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen, privacyMenuOpen, menuOpenComment]);

  const commentsCount = countOverride ?? post.commentsCount ?? post.comments?.length ?? 0;
  const topComment = (() => {
    const topLevel = (post.comments || []).filter((c) => !c.parentComment);
    if (topLevel.length) {
      return [...topLevel].sort((a, b) => (b.likesCount ?? b.likes?.length ?? 0) - (a.likesCount ?? a.likes?.length ?? 0))[0];
    }
    return post.topComment || null;
  })();
  const author = post.user || ({ name: 'Unknown user' } as Post['user']);
  const postPrivacyColor = 'text-slate-500 dark:text-slate-400';

  // ================= Actions =================

  const toggleLike = async () => {
    if (!token || liking) return;
    const prev = { liked, likesCount };
    setLiked(!prev.liked);
    setLikesCount(Math.max(0, prev.likesCount + (prev.liked ? -1 : 1)));
    setLiking(true);
    try {
      const res = await apiFetch<{ data?: { likesCount?: number; liked?: boolean } }>(`/posts/${post._id}/like`, { method: 'PUT' }, token);
      if (res.data?.likesCount !== undefined) setLikesCount(res.data.likesCount);
      if (res.data?.liked !== undefined) setLiked(res.data.liked);
    } catch (err) {
      console.error('Like action failed:', err);
      setLiked(prev.liked);
      setLikesCount(prev.likesCount);
    } finally {
      setLiking(false);
    }
  };

  const toggleBookmark = async () => {
    if (!token || saving) return;
    setSaving(true);
    setSaved((s) => !s);
    try {
      const res = await apiFetch<{ data?: { bookmarked?: boolean } }>(`/posts/${post._id}/bookmark`, { method: 'PUT' }, token);
      if (res.data?.bookmarked !== undefined) setSaved(res.data.bookmarked);
    } catch (err) {
      console.error('Bookmark action failed:', err);
      setSaved((s) => !s);
      setError(err instanceof Error ? err.message : 'Bookmark failed');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    const value = editText.trim();
    if (!token || value.length < 1) {
      setError('Post content cannot be empty.');
      return;
    }
    setSavingEdit(true);
    setError('');
    try {
      await apiFetch(`/posts/${post._id}`, { method: 'PUT', body: JSON.stringify({ body: value }) }, token);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePost = () =>
    setConfirm({
      title: 'Delete this post?',
      description: 'This post will be permanently removed from your profile and feed.',
      confirmLabel: 'Delete post',
      confirmPendingLabel: 'Deleting post...',
      onConfirm: async () => {
        if (!token) return;
        setDeleting(true);
        try {
          await apiFetch(`/posts/${post._id}`, { method: 'DELETE' }, token);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Delete failed');
        } finally {
          setDeleting(false);
        }
      },
    });

  const changePrivacy = async (value: string) => {
    if (!isOwner || !token || value === privacy) {
      setPrivacyMenuOpen(false);
      return;
    }
    const prev = privacy;
    setPrivacy(value);
    setPrivacyMenuOpen(false);
    try {
      await apiFetch(`/posts/${post._id}`, { method: 'PUT', body: JSON.stringify({ privacy: value }) }, token);
    } catch (err) {
      setPrivacy(prev);
      setError(err instanceof Error ? err.message : 'Failed to update privacy');
    }
  };

  const sharePost = async () => {
    if (!token || sharing) return;
    const body = shareText.trim();
    setSharing(true);
    setError('');
    try {
      await apiFetch(`/posts/${post._id}/share`, { method: 'POST', body: body ? JSON.stringify({ body }) : undefined }, token);
      setShareOpen(false);
      setShareText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  // ================= Comments data =================

  const loadComments = async (page = 1) => {
    if (!token) return;
    if (page === 1) {
      setLoadingComments(true);
      setError('');
    }
    try {
      const res = await apiFetch<CommentsResponse>(`/posts/${post._id}/comments?page=${page}&limit=${COMMENTS_PAGE}`, {}, token);
      const fetched = res.data.comments || [];
      setServerComments((prev) => {
        if (page === 1) return fetched;
        const seen = new Set((prev || []).map((c) => c._id));
        return [...(prev || []), ...fetched.filter((c) => !seen.has(c._id))];
      });
      const next = res.meta?.pagination?.nextPage ?? null;
      setHasMore(!!next);
      setNextPage(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      if (page === 1) setServerComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadMoreComments = async () => {
    if (!hasMore || !nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadComments(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleComments = () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    if (serverComments === null) void loadComments(1);
  };

  const loadReplies = async (commentId: string) => {
    if (!token) return [];
    const res = await apiFetch<RepliesResponse>(
      `/posts/${post._id}/comments/${commentId}/replies?page=1&limit=${REPLIES_PAGE}`,
      {},
      token
    );
    return res.data.replies || [];
  };

  const toggleReplies = async (commentId: string) => {
    if (repliesOpen[commentId]) {
      setRepliesOpen((o) => ({ ...o, [commentId]: false }));
      return;
    }
    setRepliesOpen((o) => ({ ...o, [commentId]: true }));
    if (!replies[commentId]) {
      setRepliesLoading((o) => ({ ...o, [commentId]: true }));
      try {
        const list = await loadReplies(commentId);
        setReplies((r) => ({ ...r, [commentId]: list }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load replies');
      } finally {
        setRepliesLoading((o) => ({ ...o, [commentId]: false }));
      }
    }
  };

  // ================= Comment mutations =================

  const setCommentImage = (commentId: string, file: File | null) => {
    setReplyPreview((p) => {
      const prev = p[commentId];
      if (prev) URL.revokeObjectURL(prev);
      return { ...p, [commentId]: file ? URL.createObjectURL(file) : null };
    });
    setReplyImage((i) => ({ ...i, [commentId]: file }));
  };

  const sendComment = async () => {
    const content = text.trim();
    if (!token || sending || (!content && !image)) return;
    if (content && content.length < 2) {
      setError('Comment must be at least 2 characters.');
      return;
    }
    const temp: Comment = {
      _id: `temp-comment-${Date.now()}`,
      content: content || undefined,
      image: imagePreview || undefined,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      post: post._id,
      commentCreator: (me as Comment['commentCreator']) || { _id: 'me', name: 'You', username: 'you' },
    };
    setTempComments((c) => [temp, ...c]);
    setCountOverride((c) => (c ?? commentsCount) + 1);
    setText('');
    const imageFile = image;
    setImage(null);
    setImagePreview(null);
    setSending(true);
    setError('');
    try {
      if (imageFile) {
        const form = new FormData();
        if (content) form.set('content', content);
        form.set('image', imageFile);
        await apiFetch(`/posts/${post._id}/comments`, { method: 'POST', body: form }, token);
      } else {
        await apiFetch(`/posts/${post._id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }, token);
      }
      setTempComments((c) => c.filter((t) => t._id !== temp._id));
      await loadComments(1);
    } catch (err) {
      setTempComments((c) => c.filter((t) => t._id !== temp._id));
      setCountOverride((c) => Math.max(0, (c ?? commentsCount) - 1));
      setText(content);
      setError(err instanceof Error ? err.message : 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (commentId: string) => {
    const content = (replyText[commentId] || '').trim();
    const file = replyImage[commentId];
    if (!token || replySending[commentId] || (!content && !file)) return;
    if (content && content.length < 2) {
      setError('Reply must be at least 2 characters.');
      return;
    }
    setReplySending((s) => ({ ...s, [commentId]: true }));
    setError('');
    try {
      if (file) {
        const form = new FormData();
        if (content) form.set('content', content);
        form.set('image', file);
        await apiFetch(`/posts/${post._id}/comments/${commentId}/replies`, { method: 'POST', body: form }, token);
      } else {
        await apiFetch(`/posts/${post._id}/comments/${commentId}/replies`, { method: 'POST', body: JSON.stringify({ content }) }, token);
      }
      const list = await loadReplies(commentId);
      setReplies((r) => ({ ...r, [commentId]: list }));
      setServerComments((prev) =>
        (prev || []).map((c) => (c._id === commentId ? { ...c, repliesCount: list.length } : c))
      );
      setReplyText((t) => ({ ...t, [commentId]: '' }));
      setCommentImage(commentId, null);
      setRepliesOpen((o) => ({ ...o, [commentId]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setReplySending((s) => ({ ...s, [commentId]: false }));
    }
  };

  const commentLikeInfo = (c: Comment) =>
    likeState[c._id] || {
      liked: currentUserId ? (c.likes || []).some((id) => String(id) === String(currentUserId)) : false,
      likesCount: c.likesCount ?? c.likes?.length ?? 0,
    };

  const toggleCommentLike = async (commentId: string) => {
    if (!token || likingComment[commentId]) return;
    const all = [...(serverComments || []), ...(post.comments || []), ...Object.values(replies).flat()];
    const target = all.find((c) => c._id === commentId);
    const current = target ? commentLikeInfo(target) : { liked: false, likesCount: 0 };
    setLikeState((s) => ({ ...s, [commentId]: { liked: !current.liked, likesCount: Math.max(0, current.likesCount + (current.liked ? -1 : 1)) } }));
    setLikingComment((s) => ({ ...s, [commentId]: true }));
    try {
      await apiFetch(`/posts/${post._id}/comments/${commentId}/like`, { method: 'PUT' }, token);
    } catch (err) {
      setLikeState((s) => ({ ...s, [commentId]: current }));
      setError(err instanceof Error ? err.message : 'Failed to like comment');
    } finally {
      setLikingComment((s) => ({ ...s, [commentId]: false }));
    }
  };

  const startEdit = (commentId: string, content: string) => setEditState((s) => ({ ...s, [commentId]: content }));
  const cancelEdit = (commentId: string) =>
    setEditState((s) => {
      const next = { ...s };
      delete next[commentId];
      return next;
    });

  const saveCommentEdit = async (commentId: string, parentId?: string) => {
    const content = (editState[commentId] || '').trim();
    if (!token || content.length < 2) {
      setError('Comment must be at least 2 characters.');
      return;
    }
    setSavingEditComment((s) => ({ ...s, [commentId]: true }));
    setError('');
    try {
      await apiFetch(`/posts/${post._id}/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ content }) }, token);
      if (parentId) {
        setReplies((r) => ({
          ...r,
          [parentId]: (r[parentId] || []).map((c) => (c._id === commentId ? { ...c, content } : c)),
        }));
      } else {
        setServerComments((prev) => (prev || []).map((c) => (c._id === commentId ? { ...c, content } : c)));
      }
      cancelEdit(commentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setSavingEditComment((s) => ({ ...s, [commentId]: false }));
    }
  };

  const deleteComment = (commentId: string, parentId?: string) =>
    setConfirm({
      title: 'Delete this comment?',
      description: 'This comment will be permanently removed.',
      confirmLabel: 'Delete comment',
      confirmPendingLabel: 'Deleting comment...',
      onConfirm: async () => {
        if (!token || deletingComment[commentId]) return;
        setDeletingComment((s) => ({ ...s, [commentId]: true }));
        try {
          await apiFetch(`/posts/${post._id}/comments/${commentId}`, { method: 'DELETE' }, token);
          if (parentId) {
            setReplies((r) => ({ ...r, [parentId]: (r[parentId] || []).filter((c) => c._id !== commentId) }));
            setServerComments((prev) =>
              (prev || []).map((c) =>
                c._id === parentId ? { ...c, repliesCount: Math.max(0, (c.repliesCount ?? 0) - 1) } : c
              )
            );
          } else {
            setServerComments((prev) => (prev || []).filter((c) => c._id !== commentId));
            setCountOverride((c) => Math.max(0, (c ?? commentsCount) - 1));
            void loadComments(1);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Delete failed');
        } finally {
          setDeletingComment((s) => ({ ...s, [commentId]: false }));
        }
      },
    });

  // ================= Render helpers =================

  const renderCommentRow = (c: Comment, parentId?: string) => {
    const isTemp = c._id.startsWith('temp-comment-');
    const isMyComment = !!currentUserId && c.commentCreator?._id && String(currentUserId) === String(c.commentCreator._id);
    const canManage = (isMyComment || isOwner) && !isTemp;
    const likeInfo = commentLikeInfo(c);
    const rCount = c.repliesCount ?? (replies[c._id]?.length ?? 0);
    const isReply = !!parentId;
    const isEditing = editState[c._id] !== undefined;

    return (
      <div key={c._id} className="relative flex items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.commentCreator?.photo || DEFAULT_PHOTO}
          alt={c.commentCreator?.name || 'User'}
          onError={onAvatarError}
          className={`${isReply ? 'h-6 w-6' : 'mt-0.5 h-8 w-8'} rounded-full object-cover`}
        />
        <div className="min-w-0 flex-1">
          <div
            className={`relative inline-block max-w-full rounded-2xl bg-[#f0f2f5] px-3 py-2 dark:bg-slate-800 ${
              isReply ? 'px-2.5' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`${isReply ? 'text-[11px]' : 'text-xs'} font-bold text-slate-900 dark:text-slate-100`}>
                  {c.commentCreator?.name || 'User'}
                </p>
                <p className={`${isReply ? 'text-[11px]' : 'text-xs'} text-slate-500 dark:text-slate-400`}>
                  {c.commentCreator?.username ? `@${c.commentCreator.username}` : 'member'} · {commentTime(c.createdAt)}
                </p>
              </div>
              {isTemp ? <span className="text-[11px] font-semibold text-[#1877f2] dark:text-sky-400">Sending...</span> : null}
            </div>

            {isEditing ? (
              <div className={`mt-2 flex items-center gap-2 ${isReply ? 'gap-1.5' : ''}`}>
                <input
                  value={editState[c._id]}
                  onChange={(e) => setEditState((s) => ({ ...s, [c._id]: e.target.value }))}
                  className={inputClass}
                />
                <button
                  className={smallPrimary}
                  onClick={() => void saveCommentEdit(c._id, parentId)}
                  disabled={!!savingEditComment[c._id]}
                >
                  {savingEditComment[c._id] ? (isReply ? '...' : 'Saving...') : 'Save'}
                </button>
                <button className={smallCancel} onClick={() => cancelEdit(c._id)}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {c.content ? (
                  <p className={`mt-1 whitespace-pre-wrap ${isReply ? 'mt-0.5 text-xs text-slate-700 dark:text-slate-300' : 'text-sm text-slate-800 dark:text-slate-200'}`}>
                    {renderMentions(c.content)}
                  </p>
                ) : null}
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image}
                    alt={isReply ? 'Reply' : 'Comment'}
                    className={`mt-2 w-full object-cover ${isReply ? 'mt-1.5 max-h-44 rounded-md' : 'max-h-52 rounded-lg'}`}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              {!isReply ? <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{commentTime(c.createdAt)}</span> : null}
              <button
                className={`${isReply ? 'text-[11px]' : 'text-xs'} font-semibold hover:underline disabled:opacity-60 ${
                  likeInfo.liked ? 'text-[#1877f2] dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
                }`}
                onClick={() => void toggleCommentLike(c._id)}
                disabled={isTemp || !!likingComment[c._id]}
              >
                {likingComment[c._id] ? 'Liking...' : `Like (${likeInfo.likesCount})`}
              </button>
              {!isReply ? (
                <button
                  className={`text-xs font-semibold transition hover:underline disabled:opacity-60 ${
                    repliesOpen[c._id] ? 'text-[#1877f2] dark:text-sky-400' : 'text-slate-500 hover:text-[#1877f2] dark:text-slate-400 dark:hover:text-sky-400'
                  }`}
                  onClick={() => void toggleReplies(c._id)}
                  disabled={isTemp}
                >
                  {repliesOpen[c._id] ? 'Hide replies' : `Reply${rCount > 0 ? ` (${rCount})` : ''}`}
                </button>
              ) : null}
            </div>

            {canManage ? (
              <div className="relative" data-comment-menu-root="true">
                <button
                  className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  onClick={() => setMenuOpenComment((m) => ({ [c._id]: !m[c._id] }))}
                >
                  <MoreHorizontal size={isReply ? 14 : 16} />
                </button>
                {menuOpenComment[c._id] ? (
                  <div
                    className={`absolute right-0 z-20 mt-1 ${isReply ? 'w-28' : 'w-32'} overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800`}
                  >
                    {isMyComment ? (
                      <button
                        onClick={() => {
                          startEdit(c._id, c.content || '');
                          setMenuOpenComment({});
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${isReply ? 'text-[11px]' : 'text-xs'} font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700`}
                      >
                        <Edit3 size={isReply ? 12 : 13} />
                        Edit
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setMenuOpenComment({});
                        deleteComment(c._id, parentId);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${isReply ? 'text-[11px]' : 'text-xs'} font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30`}
                      disabled={!!deletingComment[c._id]}
                    >
                      <Trash2 size={isReply ? 12 : 13} />
                      {deletingComment[c._id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {!isReply && repliesOpen[c._id] ? (
            <div className="relative mt-2 ml-5 pl-4">
              <span className="absolute bottom-10 left-0 top-1 w-px rounded-full bg-slate-300 dark:bg-slate-600" />
              {repliesLoading[c._id] ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading replies...</p>
              ) : (replies[c._id] || []).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No replies yet.</p>
              ) : (
                <div className="space-y-2">{(replies[c._id] || []).map((r) => renderCommentRow(r, c._id))}</div>
              )}

              <div className="mt-2">
                <p className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Replying to {c.commentCreator?.name || 'user'}
                </p>
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={myPhoto} alt={me?.name || 'You'} onError={onAvatarError} className="mt-0.5 h-7 w-7 rounded-full object-cover" />
                  <div className="w-full rounded-2xl border border-slate-200 bg-[#f0f2f5] px-2.5 py-1.5 focus-within:border-[#c7dafc] focus-within:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-sky-600 dark:focus-within:bg-slate-900">
                    <textarea
                      value={replyText[c._id] || ''}
                      onChange={(e) => setReplyText((t) => ({ ...t, [c._id]: e.target.value.slice(0, MAX_COMMENT_LENGTH) }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!replySending[c._id] && ((replyText[c._id] || '').trim() || replyImage[c._id])) void sendReply(c._id);
                        }
                      }}
                      placeholder="Write a reply..."
                      rows={1}
                      className="min-h-[38px] w-full resize-none bg-transparent px-2 py-1 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-200 dark:placeholder:text-slate-500"
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400">
                          <ImageIcon size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              setCommentImage(c._id, e.target.files?.[0] || null);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </div>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-sm transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:bg-[#9ec5ff] disabled:opacity-100 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-sky-900"
                        onClick={() => void sendReply(c._id)}
                        disabled={!!replySending[c._id] || (!(replyText[c._id] || '').trim() && !replyImage[c._id])}
                        aria-label="Send reply"
                      >
                        {replySending[c._id] ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                {replyPreview[c._id] ? (
                  <div className="relative mt-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={replyPreview[c._id] || ''} alt="Reply preview" className="max-h-40 w-full rounded-md object-cover" />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                      onClick={() => setCommentImage(c._id, null)}
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const visibleComments = (() => {
    const merged = [...tempComments, ...(serverComments || [])];
    return sort === 'newest'
      ? [...merged].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      : [...merged].sort((a, b) => (b.likesCount ?? b.likes?.length ?? 0) - (a.likesCount ?? a.likes?.length ?? 0));
  })();

  return (
    <>
      <article className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={author.photo || DEFAULT_PHOTO}
              alt={author.name}
              onError={onAvatarError}
              className="h-11 w-11 shrink-0 cursor-pointer rounded-full object-cover"
              onClick={() => router.push(`/profile/${author._id || ''}`)}
            />
            <div className="min-w-0 flex-1">
              <button
                className="block truncate text-sm font-bold text-slate-900 hover:underline dark:text-slate-100"
                onClick={() => router.push(`/profile/${author._id || ''}`)}
              >
                {author.name || 'Anonymous User'}
              </button>
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{postTime(post.createdAt)}</span>
                <span className="mx-1">·</span>
                {isOwner ? (
                  <span ref={privacyRef} className="relative inline-flex items-center">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                      onClick={() => setPrivacyMenuOpen((o) => !o)}
                    >
                      <PrivacyIcon size={11} className={postPrivacyColor} />
                      {privacyLabel}
                      <ChevronDown size={12} />
                    </button>
                    {privacyMenuOpen ? (
                      <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {(['public', 'following', 'only_me'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                            onClick={() => void changePrivacy(v)}
                          >
                            {v === 'public' ? <Globe size={13} /> : v === 'following' ? <Users size={13} /> : <Lock size={13} />}
                            {v === 'public' ? 'Public' : v === 'following' ? 'Followers' : 'Only me'}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <PrivacyIcon size={11} className={postPrivacyColor} />
                    {privacyLabel}
                  </span>
                )}
              </div>
            </div>

            <div ref={menuRef} className="relative">
              <button
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Post options"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    onClick={() => {
                      setMenuOpen(false);
                      void toggleBookmark();
                    }}
                    disabled={saving}
                  >
                    <Bookmark size={15} />
                    {saving ? 'Saving...' : saved ? 'Unsave post' : 'Save post'}
                  </button>
                  {isOwner && !editing ? (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditText(post.body || '');
                        setEditing(true);
                      }}
                    >
                      <Edit3 size={15} />
                      Edit post
                    </button>
                  ) : null}
                  {isOwner ? (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      onClick={() => {
                        setMenuOpen(false);
                        deletePost();
                      }}
                      disabled={deleting}
                    >
                      <Trash2 size={15} />
                      {deleting ? 'Deleting...' : 'Delete post'}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {editing ? (
            <div className="mt-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                maxLength={5000}
                className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#1877f2]/20 focus:border-[#1877f2] focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:ring-sky-900 dark:focus:border-sky-500"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  className={smallCancel}
                  onClick={() => {
                    setEditText(post.body || '');
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button className={smallPrimary} onClick={() => void saveEdit()} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : post.body ? (
            <div className="mt-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                {renderMentions(post.body)}
              </p>
            </div>
          ) : null}

          {saved ? (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#e7f3ff] px-2.5 py-1 text-[11px] font-bold text-[#1877f2] dark:bg-sky-950 dark:text-sky-400">
              <Bookmark size={12} />
              Saved
            </div>
          ) : null}
        </div>

        {post.image ? (
          <div className="max-h-[620px] overflow-hidden border-y border-slate-200 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt="post" className="w-full object-cover" />
          </div>
        ) : null}

        {post.sharedPost ? (
          <div className="mx-4 my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.sharedPost.user?.photo || DEFAULT_PHOTO}
                  alt={post.sharedPost.user?.name || 'Shared user'}
                  onError={onAvatarError}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {post.sharedPost.user?.name || 'Unknown user'}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {post.sharedPost.user?.username ? `@${post.sharedPost.user.username}` : 'Original post'}
                  </p>
                </div>
                <button
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#1877f2] hover:bg-[#e7f3ff] dark:text-sky-400 dark:hover:bg-sky-950"
                  onClick={() => router.push(`/posts/${post.sharedPost!._id}`)}
                >
                  Original Post
                  <Share2 size={13} />
                </button>
              </div>
              {post.sharedPost.body ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {renderMentions(post.sharedPost.body)}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Shared post content unavailable.</p>
              )}
            </div>
            {post.sharedPost.image ? (
              <div className="border-t border-slate-200 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.sharedPost.image} alt="Shared post" className="max-h-[560px] w-full object-cover" />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="px-4 pb-2 pt-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-white dark:bg-sky-600">
                <ThumbsUp size={12} />
              </span>
              <span className="font-semibold">{likesCount} likes</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
              <span className="inline-flex items-center gap-1">
                <Repeat2 size={13} />
                {post.sharesCount ?? 0} shares
              </span>
              <span>{commentsCount} comments</span>
              <button
                className="rounded-md px-2 py-1 text-xs font-bold text-[#1877f2] hover:bg-[#e7f3ff] dark:text-sky-400 dark:hover:bg-sky-950"
                onClick={() => router.push(`/posts/${post._id}`)}
              >
                View details
              </button>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-slate-200 dark:border-slate-800" />
        <div className="grid grid-cols-3 gap-1 p-1">
          <PostActionButton label={liking ? 'Liking...' : 'Like'} icon={<ThumbsUp size={18} />} disabled={liking} active={liked} onClick={() => void toggleLike()} />
          <PostActionButton label={loadingComments && commentsOpen ? 'Loading...' : 'Comment'} icon={<MessageSquare size={18} />} onClick={toggleComments} />
          <PostActionButton label={sharing ? 'Sharing...' : 'Share'} icon={<Share2 size={18} />} disabled={sharing} onClick={() => { setError(''); setShareOpen(true); }} />
        </div>

        {!commentsOpen && topComment ? (
          <div className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Top Comment</p>
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={topComment.commentCreator?.photo || DEFAULT_PHOTO}
                alt={topComment.commentCreator?.name || 'User'}
                onError={onAvatarError}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 dark:bg-slate-900">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{topComment.commentCreator?.name || 'User'}</p>
                {topComment.content ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{renderMentions(topComment.content)}</p>
                ) : null}
                {topComment.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={topComment.image} alt="Top comment" className="mt-2 max-h-44 w-full rounded-lg object-cover" />
                ) : null}
              </div>
            </div>
            <button className="mt-2 text-xs font-bold text-[#1877f2] hover:underline dark:text-sky-400" onClick={toggleComments}>
              View all comments
            </button>
          </div>
        ) : null}

        {commentsOpen ? (
          <div className="border-t border-slate-200 bg-[#f7f8fa] px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold tracking-wide text-slate-700 dark:text-slate-200">Comments</p>
                <span className="rounded-full bg-[#e7f3ff] px-2 py-0.5 text-[11px] font-bold text-[#1877f2] dark:bg-sky-950 dark:text-sky-400">
                  {commentsCount}
                </span>
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as 'relevant' | 'newest')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none ring-[#1877f2]/20 focus:border-[#1877f2] focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-sky-900 dark:focus:border-sky-500"
              >
                <option value="relevant">Most relevant</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            <div className="space-y-2">
              {loadingComments ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Loading comments...
                </div>
              ) : null}
              {!loadingComments && visibleComments.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef3ff] text-[#1877f2] dark:bg-sky-950 dark:text-sky-400">
                    <MessageSquare size={22} />
                  </div>
                  <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">No comments yet</p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Be the first to comment.</p>
                </div>
              ) : null}

              {visibleComments.map((c) => renderCommentRow(c))}

              {!loadingComments && visibleComments.length > 0 && hasMore ? (
                <div className="pt-2 text-center">
                  <button
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    onClick={() => void loadMoreComments()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'View more comments'}
                  </button>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
                {error}
              </div>
            ) : null}

            <div className="mt-3">
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void sendComment();
                }}
                className="flex items-start gap-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={myPhoto} alt={me?.name || 'You'} onError={onAvatarError} className="h-9 w-9 rounded-full object-cover" />
                <div className="w-full rounded-2xl border border-slate-200 bg-[#f0f2f5] px-2.5 py-1.5 focus-within:border-[#c7dafc] focus-within:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-sky-600 dark:focus-within:bg-slate-900">
                  <textarea
                    ref={commentInputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!sending && (text.trim() || image)) void sendComment();
                      }
                    }}
                    placeholder={`Comment as ${me?.name || 'you'}...`}
                    rows={1}
                    className="min-h-[40px] w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400">
                        <ImageIcon size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setImage(file);
                            setImagePreview((p) => {
                              if (p) URL.revokeObjectURL(p);
                              return file ? URL.createObjectURL(file) : null;
                            });
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-sm transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:bg-[#9ec5ff] disabled:opacity-100 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-sky-900"
                      disabled={sending || (!text.trim() && !image)}
                      aria-label="Send comment"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </form>
              {imagePreview ? (
                <div className="relative mt-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Comment preview" className="max-h-40 w-full rounded-md object-cover" />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                    onClick={() => {
                      setImage(null);
                      setImagePreview((p) => {
                        if (p) URL.revokeObjectURL(p);
                        return null;
                      });
                    }}
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </article>

      {/* Share dialog */}
      {shareOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/65 p-4" onClick={() => !sharing && setShareOpen(false)}>
          <div
            className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Share post</h4>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={() => setShareOpen(false)}
                disabled={sharing}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <textarea
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                placeholder="Say something about this..."
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:ring-sky-900"
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={author.photo || DEFAULT_PHOTO} alt={author.name} onError={onAvatarError} className="h-8 w-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{author.name || 'User'}</p>
                    <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {author.username ? `@${author.username}` : '@route'}
                    </p>
                  </div>
                </div>
                {post.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{renderMentions(post.body)}</p>
                ) : null}
                {post.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image} alt="post preview" className="mt-2 max-h-[220px] w-full rounded-lg object-cover" />
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setShareOpen(false)}
                disabled={sharing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
                onClick={() => void sharePost()}
                disabled={sharing}
              >
                {sharing ? 'Sharing...' : 'Share now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        description={confirm?.description || ''}
        confirmLabel={confirm?.confirmLabel}
        confirmPendingLabel={confirm?.confirmPendingLabel}
        confirming={confirming}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setConfirming(true);
          Promise.resolve(confirm.onConfirm())
            .catch(() => {})
            .finally(() => {
              setConfirming(false);
              setConfirm(null);
            });
        }}
      />
    </>
  );
}
