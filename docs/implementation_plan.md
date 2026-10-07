# Route Posts - Implementation Plan & Site Map

## Key Tooling & Architecture Enhancements

> [!IMPORTANT]
> - **Tailwind CSS v4 (Latest)**: Utilizing Tailwind CSS v4 for utility-first styling and modern CSS features.
> - **MCP Tools Integration**: Incorporating relevant Model Context Protocol (MCP) servers/tools for enhanced capabilities.
> - **Code-Review-Graph Integration**: Utilizing `code-review-graph` to easily inspect, visualize, and access the structural dependency graph and code relationships.

---

## Site Map & Routes

- `/auth/signin` & `/auth/signup` — Authentication pages (Login & Register with Joi validation)
- `/` (Home Feed) — Main feed with post creation widget, timeline feed, sidebar navigation, and user follow suggestions widget
- `/posts/[id]` — Detailed post view showing full post, comment section, and reply threads
- `/profile` — My profile page (Avatar upload, user stats, posts grid/feed, change password form)
- `/profile/[userId]` — User profile view with follow/unfollow toggle and user posts
- `/bookmarks` — Bookmarked posts collection page
- `/notifications` — User notifications list with read status toggles and unread counter badge

---

## Technology Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: **Tailwind CSS v4** (Latest update)
- **Tooling & Architecture**: `code-review-graph` (for project structure exploration and visual code navigation) & MCP integrations
- **Authentication**: NextAuth.js / Custom Auth Provider using `route-posts.routemisr.com` API bearer tokens
- **Validation**: Joi (Schemas for signin, signup, post creation, comment creation, change password)
- **State Management**: Zustand (Auth store, post state, UI state, notification badge counter)
- **UI Components**: Shadcn UI (Dialog, DropdownMenu, Avatar, Tabs, Input, Button, Card, Toast, Badge, Skeleton), Lucide Icons, Framer Motion

---

## API Endpoints Overview (`https://route-posts.routemisr.com`)

### 1. Users & Auth
- `POST /users/signup` (name, username, email, dateOfBirth, gender, password, rePassword)
- `POST /users/signin` (email/username/login + password) -> returns token + user
- `PATCH /users/change-password` (password, newPassword)
- `PUT /users/upload-photo` (formdata file `photo`)
- `GET /users/profile-data` (current user profile)
- `GET /users/bookmarks` (current user bookmarks)
- `GET /users/suggestions?limit=10` (follow suggestions)
- `GET /users/:id/profile` (user profile by ID)
- `PUT /users/:id/follow` (follow/unfollow user)
- `GET /users/:id/posts` (get posts of a specific user)

### 2. Posts
- `GET /posts` & `GET /posts/feed` (Home feed timeline)
- `POST /posts` (create post with formdata: body, image)
- `GET /posts/:id` (single post details)
- `GET /posts/:postId/likes` (list of likes)
- `PUT /posts/:id` (update post with body, image)
- `DELETE /posts/:id` (delete post)
- `PUT /posts/:id/like` (like/unlike)
- `PUT /posts/:id/bookmark` (bookmark/unbookmark)
- `POST /posts/:id/share` (share post with body)

### 3. Comments & Replies
- `GET /posts/:postId/comments` (list comments)
- `POST /posts/:postId/comments` (create comment: content, image)
- `GET /posts/:postId/comments/:commentId/replies` (list replies)
- `POST /posts/:postId/comments/:commentId/replies` (create reply: content, image)
- `PUT /posts/:postId/comments/:commentId` (update comment)
- `DELETE /posts/:postId/comments/:commentId` (delete comment)
- `PUT /posts/:postId/comments/:commentId/like` (like comment)

### 4. Notifications
- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

---

## Verification Plan

### Automated Verification
- TypeScript typechecks (`tsc --noEmit`)
- Next.js build (`npm run build`)

### Manual Verification
- Authentication flow (signup & login with Joi validation)
- Feed rendering, creating posts with attachments, liking & bookmarking
- Profile management, uploading profile photo, changing password
- Notifications list & read state toggles
