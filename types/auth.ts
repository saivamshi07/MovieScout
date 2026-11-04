export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  pictureUrl?: string | null;
  isPrivate?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isEmailPrivate?: boolean;
  isPhonePrivate?: boolean;
  isPicturePrivate?: boolean;
  followersCount?: number;
  followingCount?: number;
  createdAt?: string;
  updatedAt?: string;
  publicProfiles?: Record<string, any>;
}

export interface UserSearchItem {
  id: string;
  username: string;
  pictureUrl?: string | null;
  bio?: string | null;
  isPrivate: boolean;
  followersCount: number;
}

export interface RegisterData {
  username: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}
