'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import { Post } from '@/types/api';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function PostDetailsContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { token, user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSinglePost = async () => {
      setLoading(true);
      setError(null);
      try {
        if (token) {
          const res = await apiFetch<any>(`/posts/${resolvedParams.id}`, {}, token);
          const fetchedPost = res.data?.post || res.post;
          if (fetchedPost) {
            setPost(fetchedPost);
          } else {
            setError('Post not found.');
          }
        } else {
          setError('Please sign in to view post discussion.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load post discussion details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSinglePost();
  }, [resolvedParams.id, token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 text-[#002b80] dark:text-sky-400 animate-spin mb-3" />
        <span className="text-xs font-semibold">Loading post discussion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p>{error}</p>
      </div>
    );
  }

  return post ? (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-xs">Post Discussion & Thread</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-[#002b80] dark:text-sky-400 border border-sky-100 dark:border-sky-800">
          Single View
        </span>
      </div>

      <PostCard post={post} currentUserId={user?._id} />
    </div>
  ) : null;
}

export default function PostDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#002b80] dark:hover:text-sky-400 mb-5 text-xs font-bold transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#002b80] dark:text-sky-400 animate-spin" />
            </div>
          }
        >
          <PostDetailsContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
