const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api$/, '');

export function resolveImageUrl(url: string): string {
  if (url.startsWith('/uploads/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}
