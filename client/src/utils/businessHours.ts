import type { Listing } from '../types';

const DAY_SCHEMA_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string;
  opens: string;
  closes: string;
}

function displayHours(value: NonNullable<Listing['businessHours']>[string]): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && trimmed.toLowerCase() !== 'closed' ? trimmed : null;
  }

  if (typeof value === 'object') {
    const opens = typeof value.open === 'string' ? value.open.trim() : '';
    const closes = typeof value.close === 'string' ? value.close.trim() : '';
    return opens && closes ? `${opens} - ${closes}` : null;
  }

  return null;
}

export function openingHoursSpecification(
  businessHours: Listing['businessHours']
): OpeningHoursSpecification[] | undefined {
  if (!businessHours) return undefined;

  const specs = Object.entries(businessHours)
    .map(([day, value]) => {
      const dayOfWeek = DAY_SCHEMA_NAMES[day.toLowerCase()];
      const display = displayHours(value);
      if (!dayOfWeek || !display) return null;

      const [opens, closes] = display.split(/\s*-\s*/);
      if (!opens || !closes) return null;

      return {
        '@type': 'OpeningHoursSpecification' as const,
        dayOfWeek,
        opens,
        closes,
      };
    })
    .filter((spec): spec is OpeningHoursSpecification => spec !== null);

  return specs.length > 0 ? specs : undefined;
}
