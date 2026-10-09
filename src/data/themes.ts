export interface ThemeCategory {
  id: string;
  label: string;
  emoji: string;
  themes: string[];
}

export interface ThemeMatch {
  categoryId: string;
  categoryLabel: string;
  theme: string;
}

export const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: "business",
    label: "Business & Finance",
    emoji: "💼",
    themes: [
      "Corporate Infographics & Charts",
      "Growing Bar Chart & Rising Arrow",
      "Teamwork & Business Meeting Icons",
      "Digital Payment & Wallet",
      "Startup Rocket Launch",
    ],
  },
  {
    id: "tech",
    label: "Technology & AI",
    emoji: "🤖",
    themes: [
      "Artificial Intelligence Brain Network",
      "Cloud Computing & Data Flow",
      "Cyber Security Shield & Lock",
      "Futuristic Drone Flying",
      "Smartphone App Interface Showcase",
    ],
  },
  {
    id: "nature",
    label: "Nature & Environment",
    emoji: "🌿",
    themes: [
      "Growing Plant & Sprouting Seeds",
      "Ocean Waves & Sailing Boat",
      "Forest Landscape with Drifting Clouds",
      "Wind Turbines & Renewable Energy",
      "Earth Day & Recycling Cycle",
    ],
  },
  {
    id: "travel",
    label: "Travel & Transport",
    emoji: "✈️",
    themes: [
      "Airplane Flying Over Clouds",
      "City Traffic & Moving Cars",
      "Hot Air Balloon Journey",
      "Train Passing a Countryside",
      "World Map with Travel Route",
    ],
  },
  {
    id: "education",
    label: "Education & Science",
    emoji: "🎓",
    themes: [
      "Back to School Supplies",
      "Atom & Molecule Orbit",
      "Solar System Planets Orbiting",
      "Light Bulb Idea Generation",
      "Open Book with Floating Icons",
    ],
  },
  {
    id: "health",
    label: "Health & Wellness",
    emoji: "🩺",
    themes: [
      "Heartbeat & Pulse Line",
      "Medical Cross & Healthcare Icons",
      "Yoga & Meditation Calm Circle",
      "Healthy Food & Fruit Balance",
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle & Food",
    emoji: "☕",
    themes: [
      "Coffee Cup with Rising Steam",
      "Pizza Slice & Fast Food Icons",
      "Cozy Home Interior Elements",
      "Shopping Bag & Sale Promotion",
    ],
  },
  {
    id: "seasonal",
    label: "Holiday & Seasonal",
    emoji: "🎉",
    themes: [
      "Falling Snow & Winter Holiday",
      "Autumn Leaves Falling",
      "Spring Flowers Blooming",
      "Summer Beach & Sun Rays",
      "Fireworks Celebration",
    ],
  },
];

const normalize = (s: string) => s.trim().toLowerCase();

export function searchThemes(query: string, limit = 30): ThemeMatch[] {
  const q = normalize(query);
  if (!q) return [];

  const out: ThemeMatch[] = [];
  for (const c of THEME_CATEGORIES) {
    const categoryHit = normalize(c.label).includes(q);
    for (const theme of c.themes) {
      if (categoryHit || normalize(theme).includes(q)) {
        out.push({ categoryId: c.id, categoryLabel: c.label, theme });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}