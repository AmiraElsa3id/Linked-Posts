'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUpSchema, signInSchema } from '@/lib/validation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Lock, Calendar, AlertCircle, Loader2, KeyRound } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login Form State
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  
  // Register Form State
  const [registerData, setRegisterData] = useState({
    name: '',
    username: '',
    email: '',
    dateOfBirth: '',
    gender: 'male',
    password: '',
    rePassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = signInSchema.validate(loginData, { abortEarly: true });
    if (validation.error) {
      setError(validation.error.details[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<any>('/users/signin', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const token = res.token || res.data?.token;
      const user = res.user || res.data?.user;

      if (token && user) {
        setAuth(token, user);
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = signUpSchema.validate(registerData, { abortEarly: true });
    if (validation.error) {
      setError(validation.error.details[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<any>('/users/signup', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });

      const token = res.token || res.data?.token;
      const user = res.user || res.data?.user;

      if (token && user) {
        setAuth(token, user);
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Route Posts Intro & About Route Academy */}
        <div className="lg:col-span-7 space-y-6 pt-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-[#002b80] dark:text-sky-400 tracking-tight mb-3">
              Route Posts
            </h1>
            <p className="text-slate-700 dark:text-slate-300 text-lg sm:text-xl font-medium leading-relaxed">
              Connect with friends and the world around you on Route Posts.
            </p>
          </div>

          {/* About Route Academy Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <span className="text-[11px] font-bold text-[#002b80] dark:text-sky-400 tracking-widest uppercase block mb-1">
              About Route Academy
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Egypt&apos;s Leading IT Training Center Since 2012
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              Route Academy is the premier IT training center in Egypt, established in 2012. We specialize in delivering high-quality training courses in programming, web development, and application development. We&apos;ve identified the unique challenges people may face when learning new technology and made efforts to provide strategies to overcome them.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <span className="text-lg font-bold text-[#002b80] dark:text-sky-400 block">2012</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">FOUNDED</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <span className="text-lg font-bold text-[#002b80] dark:text-sky-400 block">40K+</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">GRADUATES</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <span className="text-lg font-bold text-[#002b80] dark:text-sky-400 block">50+</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PARTNER COMPANIES</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <span className="text-lg font-bold text-[#002b80] dark:text-sky-400 block">5</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">BRANCHES</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <span className="text-lg font-bold text-[#002b80] dark:text-sky-400 block">20</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DIPLOMAS AVAILABLE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Login / Register Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md">
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-[#002b80] dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-[#002b80] dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            /* LOGIN FORM */
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Log in to Route Posts</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Log in and continue your social journey.</p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      placeholder="Email or username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-[#002b80] dark:bg-sky-600 hover:bg-[#001f5c] dark:hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Log In</span>}
                </button>
              </form>

              <div className="text-center mt-6">
                <a href="#" className="text-xs text-[#002b80] dark:text-sky-400 font-semibold hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>
          ) : (
            /* REGISTER FORM */
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Create a new account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">It is quick and easy.</p>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      placeholder="Full name"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-xs absolute left-3.5 top-3.5">@</span>
                    <input
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      placeholder="Username (optional)"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="Email address"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={registerData.gender}
                      onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 dark:[color-scheme:dark]"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      value={registerData.dateOfBirth}
                      onChange={(e) => setRegisterData({ ...registerData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={registerData.rePassword}
                      onChange={(e) => setRegisterData({ ...registerData, rePassword: e.target.value })}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-[#002b80] dark:bg-sky-600 hover:bg-[#001f5c] dark:hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create New Account</span>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
