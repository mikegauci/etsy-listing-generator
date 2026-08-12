export type ChecklistKind = "community" | "targeted";

export type ChecklistSeoBrief = {
  /** Primary phrase to lead the generated Etsy title when relevant. */
  lead: string;
  /** Niche terms that match this concept only. */
  niche: string[];
  /** Supporting researched phrases — use selectively, never stuff all. */
  support: string[];
  /** When true, generated titles may lead with "Car Guy Gift" instead of Custom. */
  giftPrimary?: boolean;
  /** When true, prefer photo-shirt phrasing over generic car-shirt. */
  photoPrimary?: boolean;
};

export type ChecklistCategory = {
  id: string;
  kind: ChecklistKind;
  title: string;
  /** Vehicle / model mockup references (9 per listing). */
  items: string[];
  /** Internal SEO guidance for Generate — not shown in the checklist UI. */
  seoBrief: ChecklistSeoBrief;
};

export const COMMUNITY_LISTINGS: ChecklistCategory[] = [
  {
    id: "community-jdm",
    kind: "community",
    title: "Custom JDM Car Shirt",
    items: [
      "Toyota Supra",
      "Nissan Skyline GT-R",
      "Honda S2000",
      "Mazda RX-7",
      "Subaru WRX STI",
      "Mitsubishi Lancer Evolution",
      "Honda NSX",
      "Nissan Silvia",
      "Toyota AE86",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["JDM", "JDM Shirt"],
      support: ["Custom Photo T-Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "community-racing",
    kind: "community",
    title: "Custom Racing Car Shirt",
    items: [
      "Porsche 911 GT3",
      "Nissan GT-R",
      "Chevrolet Corvette",
      "Ford Mustang GT",
      "BMW M4",
      "Honda Civic Type R",
      "McLaren 720S",
      "Subaru WRX STI",
      "Toyota GR86",
    ],
    seoBrief: {
      lead: "Custom Racing Car Shirt",
      niche: ["Racing Shirt", "Racing Gift"],
      support: ["Custom Car Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "community-truck",
    kind: "community",
    title: "Custom Truck Shirt",
    items: [
      "Ford Raptor",
      "Chevrolet C10",
      "Ram 2500",
      "GMC Sierra",
      "Toyota Tundra",
      "Nissan Frontier",
      "Jeep Gladiator",
      "Rivian R1T",
      "Ford F-150",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Truck Shirt", "Custom Truck Shirt"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "community-off-road",
    kind: "community",
    title: "Custom 4x4 & Off-Road Car Shirt",
    items: [
      "Toyota Land Cruiser",
      "Jeep Wrangler",
      "Ford Bronco",
      "Land Rover Defender",
      "Toyota Hilux",
      "Nissan Patrol",
      "Suzuki Jimny",
      "Lexus GX",
      "Chevrolet Blazer",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["4x4", "Off-Road"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "community-supercar",
    kind: "community",
    title: "Custom Sports & Supercar Shirt",
    items: [
      "Ferrari F40",
      "Lamborghini Aventador",
      "McLaren Senna",
      "Porsche 911",
      "Bugatti Chiron",
      "Koenigsegg Jesko",
      "Pagani Zonda",
      "Aston Martin Vantage",
      "Maserati MC20",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Sports Car", "Supercar"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "community-photo",
    kind: "community",
    title: "Custom Photo Car Shirt",
    items: [
      "Toyota Supra",
      "Ford Mustang",
      "BMW M3",
      "Porsche 911",
      "Honda Civic",
      "Chevrolet Corvette",
      "Audi R8",
      "Nissan Skyline",
      "Mercedes-AMG GT",
    ],
    seoBrief: {
      lead: "Custom Photo Shirt",
      niche: ["Custom Photo T-Shirt", "Custom Car Shirt"],
      support: ["Personalized T-Shirt", "Car Guy Gift"],
      photoPrimary: true,
    },
  },
];

export const TARGETED_LISTINGS: ChecklistCategory[] = [
  {
    id: "targeted-japanese",
    kind: "targeted",
    title: "Custom Japanese Car Shirt",
    items: [
      "Toyota Supra MK4",
      "Honda Civic Type R",
      "Nissan GT-R R35",
      "Mazda RX-7 FD",
      "Subaru WRX STI",
      "Mitsubishi Lancer Evolution",
      "Honda S2000",
      "Nissan Silvia S15",
      "Lexus IS F",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Japanese Car", "JDM"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-american",
    kind: "targeted",
    title: "Custom American Car Shirt",
    items: [
      "Ford Mustang",
      "Chevrolet Corvette",
      "Chevrolet Camaro",
      "Dodge Challenger",
      "Dodge Charger",
      "Pontiac GTO",
      "Ford GT",
      "Shelby GT500",
      "Plymouth Cuda",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["American Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-classic",
    kind: "targeted",
    title: "Custom Classic Car Shirt",
    items: [
      "Ford Mustang 1969",
      "Chevrolet Chevelle SS",
      "Jaguar E-Type",
      "Porsche 911 Classic",
      "Mercedes 300SL",
      "Volkswagen Beetle",
      "Ford GT40",
      "Chevrolet Bel Air",
      "Alfa Romeo Spider",
    ],
    seoBrief: {
      lead: "Custom Classic Car Shirt",
      niche: ["Classic Car", "Classic Car Gift"],
      support: ["Custom Car Shirt", "Custom Photo Shirt"],
    },
  },
  {
    id: "targeted-european",
    kind: "targeted",
    title: "Custom European Car Shirt",
    items: [
      "Porsche 911",
      "BMW M3",
      "Audi RS6",
      "Mercedes-AMG GT",
      "Volkswagen Golf GTI",
      "BMW M4",
      "Audi R8",
      "Porsche Cayman",
      "Mercedes C63 AMG",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["European Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-car-guy-gift",
    kind: "targeted",
    title: "Car Guy Gift - Custom Car Shirt",
    items: [
      "Ford Mustang",
      "Toyota Supra",
      "Porsche 911",
      "BMW M3",
      "Chevrolet Corvette",
      "Nissan GT-R",
      "Honda Civic Type R",
      "Jeep Wrangler",
      "Audi R8",
    ],
    seoBrief: {
      lead: "Car Guy Gift",
      niche: ["Car Guy Gift"],
      support: [
        "Custom Car Shirt",
        "Custom Photo Shirt",
        "Personalized T-Shirt",
      ],
      giftPrimary: true,
    },
  },
  {
    id: "targeted-from-photo",
    kind: "targeted",
    title: "Custom Car T-Shirt From Photo",
    items: [
      "Toyota Supra",
      "Ford Mustang",
      "BMW M3",
      "Porsche 911",
      "Honda S2000",
      "Chevrolet Camaro",
      "Nissan Skyline GT-R",
      "Mercedes-AMG GT",
      "Audi RS6",
    ],
    seoBrief: {
      lead: "Custom Photo Shirt",
      niche: ["Custom Car T-Shirt", "From Photo"],
      support: ["Custom Car Shirt", "Custom Photo T-Shirt", "Car Guy Gift"],
      photoPrimary: true,
    },
  },
  {
    id: "targeted-picture",
    kind: "targeted",
    title: "Custom Picture Car Shirt",
    items: [
      "Mazda RX-7",
      "Dodge Challenger",
      "Volkswagen Golf GTI",
      "Subaru WRX STI",
      "Ford Bronco",
      "Lamborghini Aventador",
      "Honda NSX",
      "Chevrolet Corvette",
      "Land Rover Defender",
    ],
    seoBrief: {
      lead: "Custom Picture Shirt",
      niche: ["Custom Picture Shirt", "Custom Car Shirt"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
      photoPrimary: true,
    },
  },
  {
    id: "targeted-performance",
    kind: "targeted",
    title: "Custom Performance Car Shirt",
    items: [
      "Honda Civic Type R",
      "Subaru WRX STI",
      "Ford Focus RS",
      "BMW M3",
      "Volkswagen Golf R",
      "Nissan GT-R",
      "Toyota GR Supra",
      "Chevrolet Camaro ZL1",
      "Mercedes C63 AMG",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Performance Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-luxury",
    kind: "targeted",
    title: "Custom Luxury Car Shirt",
    items: [
      "Porsche Panamera",
      "Mercedes S-Class",
      "BMW 7 Series",
      "Audi A8",
      "Lexus LS",
      "Range Rover",
      "Bentley Continental GT",
      "Maserati Quattroporte",
      "Porsche Cayenne Turbo",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Luxury Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-muscle",
    kind: "targeted",
    title: "Custom Muscle Car Shirt",
    items: [
      "Ford Mustang",
      "Chevrolet Corvette",
      "Chevrolet Camaro",
      "Dodge Challenger",
      "Dodge Charger",
      "Pontiac GTO",
      "Shelby GT500",
      "Plymouth Cuda",
      "Pontiac Trans Am",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Muscle Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-rally",
    kind: "targeted",
    title: "Custom Rally Car Shirt",
    items: [
      "Subaru Impreza WRX STI",
      "Mitsubishi Lancer Evolution",
      "Ford Focus RS",
      "Toyota GR Yaris",
      "Audi Quattro",
      "Lancia Delta Integrale",
      "Peugeot 205 GTI",
      "Volkswagen Golf R",
      "Ford Escort RS Cosworth",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Rally Car", "Rally"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-modified",
    kind: "targeted",
    title: "Custom Modified Car Shirt",
    items: [
      "Honda Civic EK",
      "Nissan Silvia S15",
      "Volkswagen Golf GTI",
      "Ford Mustang",
      "Toyota Supra",
      "Mazda RX-7",
      "BMW E30 M3",
      "Subaru WRX STI",
      "Nissan 350Z",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Modified Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-vintage",
    kind: "targeted",
    title: "Custom Vintage Car Shirt",
    items: [
      "Volkswagen Beetle",
      "Mini Cooper Classic",
      "Fiat 500",
      "Ford Mustang 1965",
      "Chevrolet Camaro 1969",
      "Porsche 356",
      "Jaguar XK",
      "Mercedes Pagoda",
      "Citroen DS",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["Vintage Car", "Classic Car"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
  {
    id: "targeted-suv-4x4",
    kind: "targeted",
    title: "Custom SUV & 4x4 Shirt",
    items: [
      "Toyota Land Cruiser",
      "Jeep Wrangler",
      "Ford Bronco",
      "Land Rover Defender",
      "Toyota 4Runner",
      "Porsche Cayenne",
      "BMW X5 M",
      "Range Rover",
      "Chevrolet Tahoe",
    ],
    seoBrief: {
      lead: "Custom Car Shirt",
      niche: ["SUV", "4x4"],
      support: ["Custom Photo Shirt", "Car Guy Gift"],
    },
  },
];

export const ALL_CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  ...COMMUNITY_LISTINGS,
  ...TARGETED_LISTINGS,
];

/** Old checklist category ids → new ids (preserves completion across roadmap refresh). */
export const LEGACY_CHECKLIST_ID_MAP: Record<string, string> = {
  "community-car-portrait": "community-photo",
  "community-american-muscle": "targeted-muscle",
  "brand-toyota": "targeted-japanese",
  "brand-honda": "targeted-japanese",
  "brand-nissan": "targeted-japanese",
  "brand-mazda": "targeted-japanese",
  "brand-subaru": "targeted-japanese",
  "brand-ford": "targeted-american",
  "brand-chevrolet": "targeted-american",
  "brand-dodge": "targeted-muscle",
  "brand-jeep": "targeted-suv-4x4",
  "brand-porsche": "targeted-european",
  "brand-bmw": "targeted-european",
  "brand-audi": "targeted-european",
  "brand-mercedes": "targeted-european",
  "brand-volkswagen": "targeted-european",
};

/** Map a stored category id through the legacy remap (identity if unknown/new). */
export function remapChecklistCategoryId(id: string): string {
  return LEGACY_CHECKLIST_ID_MAP[id] ?? id;
}

/** Remap + dedupe category ids, keeping only currently valid ones. */
export function normalizeChecklistCategoryIds(ids: string[]): string[] {
  const valid = new Set(ALL_CHECKLIST_CATEGORIES.map((c) => c.id));
  const remapped = ids.map(remapChecklistCategoryId).filter((id) => valid.has(id));
  return Array.from(new Set(remapped));
}

/** Look up SEO brief by exact roadmap concept title (case-insensitive). */
export function getSeoBriefForSubject(subject: string): ChecklistSeoBrief | null {
  const needle = subject.trim().toLowerCase();
  if (!needle) return null;
  const match = ALL_CHECKLIST_CATEGORIES.find(
    (c) => c.title.toLowerCase() === needle
  );
  return match?.seoBrief ?? null;
}

export type ChecklistState = {
  /** Listing categories marked as created */
  doneCategories: string[];
};

export const EMPTY_CHECKLIST_STATE: ChecklistState = {
  doneCategories: [],
};

/** Google Images search URL for a mockup brand or model label. */
export function googleImagesUrl(label: string): string {
  const params = new URLSearchParams({ tbm: "isch", q: label });
  return `https://www.google.com/search?${params.toString()}`;
}
