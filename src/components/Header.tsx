'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { Home, User, Bell, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useEffect } from 'react';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useNotificationStore } from '@/store/notificationStore';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useNotificationSocket();

  useEffect(() => {
    initAuth();
    initTheme();
  }, [initAuth, initTheme]);

  if (pathname?.startsWith('/auth')) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#002b80] dark:bg-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md">
            R
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#002b80] dark:text-sky-400">
            Route<span className="text-slate-800 dark:text-slate-100 ml-1">Posts</span>
          </span>
        </Link>

        {/* Center Pill Navigation */}
        {isAuthenticated && (
          <nav className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <Link
              href="/"
              className={`px-5 py-2 rounded-full flex items-center gap-2 text-xs font-semibold transition-all ${
                pathname === '/'
                  ? 'bg-white dark:bg-slate-900 text-[#002b80] dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Feed</span>
            </Link>

            <Link
              href="/profile"
              className={`px-5 py-2 rounded-full flex items-center gap-2 text-xs font-semibold transition-all ${
                pathname === '/profile'
                  ? 'bg-white dark:bg-slate-900 text-[#002b80] dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>

            <Link
              href="/notifications"
              className={`px-5 py-2 rounded-full flex items-center gap-2 text-xs font-semibold transition-all ${
                pathname === '/notifications'
                  ? 'bg-white dark:bg-slate-900 text-[#002b80] dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-4 text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span>Notifications</span>
            </Link>
          </nav>
        )}

        {/* Dark / Light Mode Toggle & User Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                  {user?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-500 dark:text-slate-400 m-1.5" />
                  )}
                </div>
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">{user?.name || 'User'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/auth?tab=register"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#002b80] dark:bg-sky-600 text-white hover:bg-[#001f5c] dark:hover:bg-sky-500 transition-all shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
