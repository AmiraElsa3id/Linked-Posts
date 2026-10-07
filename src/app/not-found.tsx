'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { Home, Search, User } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      <Header />

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Search className="h-10 w-10 text-slate-400 dark:text-slate-500" />
          </div>

          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100">404</h1>
            <p className="mt-2 text-lg font-semibold text-slate-600 dark:text-slate-400">Page not found</p>
          </div>

          <p className="text-slate-500 dark:text-slate-400">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#002b80] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#001f5c] dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              <Home size={16} />
              Back to Feed
            </Link>
            <Link
              href="/suggestions"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <User size={16} />
              Find People
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}