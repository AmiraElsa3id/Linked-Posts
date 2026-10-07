export interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  photo?: string;
  cover?: string;
  createdAt?: string;
  followers?: (string | { _id: string })[];
  following?: (string | { _id: string })[];
  bookmarks?: (string | { _id: string })[];
  followersCount?: number;
  followingCount?: number;
  bookmarksCount?: number;
}

export interface Comment {
  _id: string;
  content?: string;
  commentCreator: Pick<User, '_id' | 'name' | 'username' | 'photo'>;
  post: string;
  parentComment?: string | null;
  image?: string;
  createdAt: string;
  likes?: string[];
  likesCount?: number;
  repliesCount?: number;
}

/** Entry returned by GET /users/suggestions and GET /users/search */
export interface SuggestedUser {
  _id: string;
  name: string;
  username?: string;
  photo?: string;
  followersCount?: number;
  mutualFollowersCount?: number;
}

export interface Pagination {
  currentPage: number;
  limit: number;
  total: number;
  numberOfPages: number;
  nextPage?: number;
}

export interface Post {
  _id: string;
  body: string;
  image?: string;
  user: User;
  privacy?: 'public' | 'private' | 'group' | string;
  createdAt: string;
  comments?: Comment[];
  likes?: string[];
  bookmarks?: string[];
  sharesCount?: number;
  likesCount?: number;
  commentsCount?: number;
  topComment?: Comment | null;
  sharedPost?: Post | null;
  bookmarked?: boolean;
  id?: string;
}

export interface NotificationActor {
  _id: string;
  name: string;
  photo?: string;
}

/** Shape returned by GET /notifications on route-posts.routemisr.com */
export interface NotificationItem {
  _id: string;
  /** e.g. like_post, comment_post, share_post, follow_user, like_comment, reply_comment */
  type: string;
  recipient: NotificationActor;
  actor: NotificationActor;
  entityType: 'post' | 'user' | 'comment' | string;
  entityId: string;
  entity?: {
    _id: string;
    body?: string;
    content?: string;
    name?: string;
    topComment?: { content?: string } | null;
  } | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: { notifications: NotificationItem[] };
  meta?: {
    pagination?: { currentPage: number; limit: number; total: number; numberOfPages: number };
  };
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  message?: string;
  posts?: T;
  post?: T;
  user?: T;
  comments?: T;
  notifications?: T;
  data?: T;
}
