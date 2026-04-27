/**
 * Festival / seasonal event calendar for Uttarakhand.
 * Each event has an impact_multiplier that the Holt-Winters model can use
 * to scale the forecast when a festival is active.
 *
 * applies_to_slug: null = affects all locations; else specific slug.
 */

export interface FestivalEvent {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  impact_multiplier: number; // 1.0 = no change, 2.5 = 2.5× normal traffic
  applies_to_slug: string | null; // null = all locations
  category: 'Religious' | 'Cultural' | 'Adventure' | 'Seasonal';
  description: string;
}

export const FESTIVAL_CALENDAR: FestivalEvent[] = [
  {
    id: 'holi-2025',
    name: 'Holi',
    start_date: '2025-03-14',
    end_date: '2025-03-15',
    impact_multiplier: 2.8,
    applies_to_slug: null,
    category: 'Cultural',
    description: 'Festival of colours — peaks at Haridwar and Rishikesh Ganga ghats.',
  },
  {
    id: 'char-dham-2025',
    name: 'Char Dham Yatra',
    start_date: '2025-05-01',
    end_date: '2025-06-30',
    impact_multiplier: 3.5,
    applies_to_slug: 'kedarnath',
    category: 'Religious',
    description: 'Annual Kedarnath & Badrinath temple opening draws millions of pilgrims.',
  },
  {
    id: 'char-dham-badrinath-2025',
    name: 'Char Dham Yatra',
    start_date: '2025-05-01',
    end_date: '2025-06-30',
    impact_multiplier: 3.0,
    applies_to_slug: 'badrinath',
    category: 'Religious',
    description: 'Badrinath Dham opening season.',
  },
  {
    id: 'summer-peak-2025',
    name: 'Summer Peak Season',
    start_date: '2025-05-15',
    end_date: '2025-06-15',
    impact_multiplier: 2.2,
    applies_to_slug: null,
    category: 'Seasonal',
    description: 'School holidays drive surge across all hill stations.',
  },
  {
    id: 'valley-flowers-2025',
    name: 'Valley of Flowers Season',
    start_date: '2025-07-01',
    end_date: '2025-09-30',
    impact_multiplier: 2.5,
    applies_to_slug: 'valley-of-flowers',
    category: 'Adventure',
    description: 'Peak blooming season — UNESCO site sees maximum footfall.',
  },
  {
    id: 'navratri-2025',
    name: 'Navratri',
    start_date: '2025-09-22',
    end_date: '2025-10-02',
    impact_multiplier: 2.4,
    applies_to_slug: 'haridwar',
    category: 'Religious',
    description: 'Nine nights of Devi worship — Haridwar becomes extremely crowded.',
  },
  {
    id: 'diwali-2025',
    name: 'Diwali & Dev Deepawali',
    start_date: '2025-10-20',
    end_date: '2025-10-23',
    impact_multiplier: 2.6,
    applies_to_slug: 'haridwar',
    category: 'Religious',
    description: 'Dev Deepawali at Haridwar — thousands of diyas on the Ganges.',
  },
  {
    id: 'winter-ski-2025',
    name: 'Ski Season Opens',
    start_date: '2025-12-20',
    end_date: '2026-03-15',
    impact_multiplier: 2.0,
    applies_to_slug: 'auli',
    category: 'Adventure',
    description: 'Auli ski slopes open — peak footfall in January.',
  },
  {
    id: 'new-year-2026',
    name: 'New Year Weekend',
    start_date: '2025-12-30',
    end_date: '2026-01-02',
    impact_multiplier: 3.0,
    applies_to_slug: null,
    category: 'Cultural',
    description: 'All destinations see 3× normal traffic over New Year.',
  },
  {
    id: 'makar-sankranti-2026',
    name: 'Makar Sankranti',
    start_date: '2026-01-14',
    end_date: '2026-01-14',
    impact_multiplier: 2.0,
    applies_to_slug: 'haridwar',
    category: 'Religious',
    description: 'Major bathing festival at Haridwar.',
  },
];

/**
 * Returns festivals active on a given date (ISO string).
 */
export function getActiveFestivals(dateIso: string, locationSlug?: string): FestivalEvent[] {
  return FESTIVAL_CALENDAR.filter((f) => {
    const inRange = dateIso >= f.start_date && dateIso <= f.end_date;
    const matchesLocation = f.applies_to_slug === null || f.applies_to_slug === locationSlug;
    return inRange && matchesLocation;
  });
}

/**
 * Get the combined impact multiplier for today (max of all active events).
 */
export function getTodayMultiplier(locationSlug?: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const active = getActiveFestivals(today, locationSlug);
  if (active.length === 0) return 1.0;
  return Math.max(...active.map((f) => f.impact_multiplier));
}
