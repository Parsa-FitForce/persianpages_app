export interface User {
  id: string;
  email: string;
  name: string;
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
  title: string;
  description: string;
  phone?: string;
  address: string;
  city: string;
  country: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: { id: string; name: string };
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
