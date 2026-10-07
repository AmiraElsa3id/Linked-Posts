'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import { useAuthStore } from '@/store/authStore';
import { Post } from '@/types/api';
import { apiFetch } from '@/lib/api';
import {
  FileText,
  UserCheck,
  Bookmark,
  Image as ImageIcon,
  Smile,
  Send,
  RefreshCw,
  Users,
} from 'lucide-react';
import { MobileSuggestedFriends, SuggestedFriendsCard, useSuggestedFriends } from '@/components/SuggestedFriends';

export default function HomeFeedPage() {
  const { user, token } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'feed' | 'my-posts' | 'community' | 'saved'>('feed');

  // Suggested Friends (uses /users/suggestions + /users/search?q= with debounce)
  const suggestedFriends = useSuggestedFriends(token);

  const fetchTabPosts = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        setPosts([]);
        return;
      }

      let endpoint = '/posts?limit=20';
      if (activeSidebarTab === 'my-posts' && user?._id) {
        endpoint = `/users/${user._id}/posts`;
      } else if (activeSidebarTab === 'saved') {
        endpoint = '/users/bookmarks';
      } else if (activeSidebarTab === 'community') {
        endpoint = '/posts?limit=40';
      }

      const res = await apiFetch<any>(endpoint, {}, token);

      let fetchedPosts: Post[] = [];
      if (res.data?.posts) {
        fetchedPosts = res.data.posts;
      } else if (res.posts) {
        fetchedPosts = res.posts;
      } else if (res.data?.bookmarks) {
        fetchedPosts = res.data.bookmarks;
      } else if (res.bookmarks) {
        fetchedPosts = res.bookmarks;
      }

      setPosts(fetchedPosts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeSidebarTab, token, user]);

  useEffect(() => {
    fetchTabPosts();
  }, [fetchTabPosts]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !selectedImage) return;

    setPublishing(true);
    try {
      const formData = new FormData();
      formData.append('body', postContent);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      if (token) {
        await apiFetch('/posts', { method: 'POST', body: formData }, token);
        fetchTabPosts();
      }

      setPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar Navigation Tabs */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm space-y-1">
            
            {/* Feed Tab */}
            <button
              onClick={() => setActiveSidebarTab('feed')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'feed'
                  ? 'bg-sky-50 dark:bg-sky-950 text-[#002b80] dark:text-sky-400 font-bold border border-sky-100 dark:border-sky-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Feed</span>
              </div>
            </button>

            {/* My Posts Tab */}
            <button
              onClick={() => setActiveSidebarTab('my-posts')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'my-posts'
                  ? 'bg-sky-50 dark:bg-sky-950 text-[#002b80] dark:text-sky-400 font-bold border border-sky-100 dark:border-sky-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                <span>My Posts</span>
              </div>
            </button>

            {/* Community Tab */}
            <button
              onClick={() => setActiveSidebarTab('community')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'community'
                  ? 'bg-sky-50 dark:bg-sky-950 text-[#002b80] dark:text-sky-400 font-bold border border-sky-100 dark:border-sky-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Community</span>
              </div>
            </button>

            {/* Saved Tab */}
            <button
              onClick={() => setActiveSidebarTab('saved')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                activeSidebarTab === 'saved'
                  ? 'bg-sky-50 dark:bg-sky-950 text-[#002b80] dark:text-sky-400 font-bold border border-sky-100 dark:border-sky-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4" />
                <span>Saved</span>
              </div>
            </button>

          </div>
        </div>

        {/* Center Feed Timeline */}
        <div className="lg:col-span-6 space-y-5">
          {/* Mobile Suggested Friends (collapsible) */}
          <div className="xl:hidden">
            <MobileSuggestedFriends state={suggestedFriends} />
          </div>
          
          {/* Post Creator Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex-shrink-0">
                {user?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{user?.name || 'Guest User'}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg px-2 py-0.5 focus:outline-none"
                  >
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Only me</option>
                  </select>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreatePost}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.name ? user.name.split(' ')[0] : 'there'}?`}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#002b80] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none mb-3"
              />

              {imagePreview && (
                <div className="relative mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-60 bg-slate-50 dark:bg-slate-800/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#002b80] dark:hover:text-sky-400 cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Photo/video</span>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>

                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#002b80] dark:hover:text-sky-400 transition-colors"
                  >
                    <Smile className="w-4 h-4 text-amber-500" />
                    <span>Feeling/activity</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={publishing || (!postContent.trim() && !selectedImage)}
                  className="px-5 py-2 bg-[#002b80] dark:bg-sky-600 hover:bg-[#001f5c] dark:hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>Post</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Active Tab Header Title */}
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm capitalize">
              {activeSidebarTab === 'feed' && 'Main Timeline Feed'}
              {activeSidebarTab === 'my-posts' && 'My Published Posts'}
              {activeSidebarTab === 'community' && 'Community Posts Stream'}
              {activeSidebarTab === 'saved' && 'Saved Bookmarked Posts'}
            </h2>
            <button
              onClick={fetchTabPosts}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#002b80] dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh tab content"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse h-40" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post._id} post={post} currentUserId={user?._id} />
            ))
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
              {activeSidebarTab === 'saved'
                ? 'No saved posts yet. Bookmark posts to view them here.'
                : activeSidebarTab === 'my-posts'
                ? 'You have not published any posts yet.'
                : 'No posts available.'}
            </div>
          )}
        </div>

        {/* Right Sidebar: Suggested Friends */}
        <div className="lg:col-span-3 space-y-4">
          <SuggestedFriendsCard state={suggestedFriends} />
        </div>

      </main>
    </div>
  );
}
