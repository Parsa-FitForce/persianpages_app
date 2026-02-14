import { PrismaClient } from '@prisma/client';

// Persian to Latin transliteration map
const PERSIAN_MAP: Record<string, string> = {
  'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's',
  'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
  'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
  'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
  'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'و': 'v', 'ه': 'h', 'ی': 'y', 'ي': 'y', 'ئ': 'y', 'ة': 'h',
  'ؤ': 'v', 'إ': 'e', 'أ': 'a', 'ك': 'k',
  // Persian digits
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  // Common diacritics — strip
  '\u064B': '', '\u064C': '', '\u064D': '', '\u064E': '', '\u064F': '',
  '\u0650': '', '\u0651': '', '\u0652': '', '\u200C': '-', // ZWNJ → hyphen
};

function transliterate(text: string): string {
  let result = '';
  for (const char of text) {
    if (char in PERSIAN_MAP) {
      result += PERSIAN_MAP[char];
    } else {
      result += char;
    }
  }
  return result;
}

export function generateSlugBase(title: string, city: string): string {
  const combined = `${title} ${city}`;
  const transliterated = transliterate(combined);

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric
    .replace(/\s+/g, '-')          // Spaces → hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Trim leading/trailing hyphens
    .slice(0, 80);                 // Max length
}

export async function generateUniqueSlug(
  prisma: PrismaClient,
  title: string,
  city: string,
  excludeId?: string,
): Promise<string> {
  const base = generateSlugBase(title, city);
  if (!base) return `listing-${Date.now()}`;

  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.listing.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix++;
  }
}
