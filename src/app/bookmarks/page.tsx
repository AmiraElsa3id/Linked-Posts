'use client';

import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import { useAuthStore } from '@/store/authStore';
import { Bookmark, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function BookmarksPage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Bookmark className="w-5 h-5 fill-amber-500 dark:fill-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Saved Bookmarks</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Collection of posts saved for later reading</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto">
          <Sparkles className="w-10 h-10 text-[#002b80] dark:text-sky-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No bookmarked posts yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
            Click the bookmark icon on any post in your feed to save it here.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-[#002b80] dark:bg-sky-600 hover:bg-[#001f5c] dark:hover:bg-sky-500 text-white font-medium rounded-xl text-xs transition-all shadow-md shadow-[#002b80]/20 dark:shadow-sky-600/20"
          >
            Explore Timeline Feed
          </Link>
        </div>
      </main>
    </div>
  );
}
