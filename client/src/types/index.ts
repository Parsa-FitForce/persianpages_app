export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  googleId?: string;
  hasPassword?: boolean;
}

export interface Category {
  id: string;
  name: string;
  nameFa: string;
  icon: string;
  slug: string;
}

export interface Listing {
  id: string;
  slug?: string;
  title: string;
  description: string;
  phone?: string;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
  };
  businessHours?: {
    [key: string]: string;
  };
  photos: string[];
  phoneVerified?: boolean;
  isActive: boolean;
  source: string;
  isClaimed: boolean;
  claimedAt?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  user?: { id: string; name: string };
  categoryId: string;
  category: Category;
}

export interface ListingsResponse {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}
