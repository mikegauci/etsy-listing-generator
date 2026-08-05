export type ChecklistKind = "community" | "brand";

export type ChecklistCategory = {
  id: string;
  kind: ChecklistKind;
  title: string;
  /** Brands (community) or models (brand) to showcase in mockups */
  items: string[];
};

export const COMMUNITY_LISTINGS: ChecklistCategory[] = [
  {
    id: "community-jdm",
    kind: "community",
    title: "Custom JDM T-Shirt",
    items: [
      "Toyota",
      "Nissan",
      "Honda",
      "Mazda",
      "Subaru",
      "Mitsubishi",
      "Lexus",
      "Acura",
      "Suzuki",
    ],
  },
  {
    id: "community-american-muscle",
    kind: "community",
    title: "Custom American Muscle T-Shirt",
    items: [
      "Ford",
      "Chevrolet",
      "Dodge",
      "Pontiac",
      "Plymouth",
      "Buick",
      "Oldsmobile",
      "Mercury",
      "Shelby",
    ],
  },
  {
    id: "community-truck",
    kind: "community",
    title: "Custom Truck T-Shirt",
    items: [
      "Ford",
      "Chevrolet",
      "Ram",
      "GMC",
      "Toyota",
      "Nissan",
      "Jeep",
      "Rivian",
      "Isuzu",
    ],
  },
  {
    id: "community-off-road",
    kind: "community",
    title: "Custom Off-Road T-Shirt",
    items: [
      "Toyota",
      "Jeep",
      "Ford",
      "Land Rover",
      "Nissan",
      "Suzuki",
      "Lexus",
      "Chevrolet",
      "GMC",
    ],
  },
  {
    id: "community-supercar",
    kind: "community",
    title: "Custom Supercar T-Shirt",
    items: [
      "Ferrari",
      "Lamborghini",
      "McLaren",
      "Porsche",
      "Bugatti",
      "Koenigsegg",
      "Pagani",
      "Aston Martin",
      "Maserati",
    ],
  },
  {
    id: "community-car-portrait",
    kind: "community",
    title: "Custom Car Portrait T-Shirt",
    items: [
      "Toyota",
      "Ford",
      "BMW",
      "Porsche",
      "Honda",
      "Chevrolet",
      "Audi",
      "Nissan",
      "Mercedes",
    ],
  },
];

export const BRAND_LISTINGS: ChecklistCategory[] = [
  {
    id: "brand-toyota",
    kind: "brand",
    title: "Custom Toyota T-Shirt",
    items: [
      "Supra MK4",
      "GR Supra",
      "GR86",
      "Corolla GR",
      "Tacoma TRD Pro",
      "Tundra TRD Pro",
      "Land Cruiser 70",
      "Land Cruiser 300",
      "Hilux",
    ],
  },
  {
    id: "brand-ford",
    kind: "brand",
    title: "Custom Ford T-Shirt",
    items: [
      "Mustang GT",
      "Shelby GT350",
      "Shelby GT500",
      "F-150 Raptor",
      "Bronco Wildtrak",
      "Focus RS",
      "Fiesta ST",
      "Explorer ST",
      "GT40",
    ],
  },
  {
    id: "brand-chevrolet",
    kind: "brand",
    title: "Custom Chevrolet T-Shirt",
    items: [
      "Corvette C8 Z06",
      "Corvette C7 ZR1",
      "Camaro ZL1",
      "Silverado 1500",
      "Tahoe Z71",
      "Suburban",
      "Chevelle SS",
      "El Camino SS",
      "Blazer EV SS",
    ],
  },
  {
    id: "brand-porsche",
    kind: "brand",
    title: "Custom Porsche T-Shirt",
    items: [
      "911 GT3 RS",
      "911 Turbo S",
      "911 Dakar",
      "Cayman GT4 RS",
      "Cayman GT4",
      "Boxster GTS",
      "Macan GTS",
      "Cayenne Turbo GT",
      "Taycan Turbo S",
    ],
  },
  {
    id: "brand-bmw",
    kind: "brand",
    title: "Custom BMW T-Shirt",
    items: [
      "E30 M3",
      "E46 M3",
      "M3 G80",
      "M4 G82",
      "M5 CS",
      "X5 M",
      "X3 M",
      "Z4 M40i",
      "2002 Turbo",
    ],
  },
  {
    id: "brand-honda",
    kind: "brand",
    title: "Custom Honda T-Shirt",
    items: [
      "NSX",
      "Civic Type R FL5",
      "Civic EK9",
      "Integra Type R",
      "S2000",
      "Prelude",
      "Accord Type R",
      "CR-X",
      "CR-V",
    ],
  },
  {
    id: "brand-nissan",
    kind: "brand",
    title: "Custom Nissan T-Shirt",
    items: [
      "Skyline GT-R R34",
      "GT-R R35",
      "Silvia S15",
      "350Z",
      "370Z",
      "Z (RZ34)",
      "Patrol Y62",
      "Frontier Pro-4X",
      "Xterra",
    ],
  },
  {
    id: "brand-audi",
    kind: "brand",
    title: "Custom Audi T-Shirt",
    items: [
      "RS3",
      "RS4 Avant",
      "RS5",
      "RS6 Avant",
      "RS7",
      "TT RS",
      "R8 V10",
      "SQ5",
      "Q8",
    ],
  },
  {
    id: "brand-mercedes",
    kind: "brand",
    title: "Custom Mercedes T-Shirt",
    items: [
      "190E Evolution II",
      "C63 AMG",
      "E63 AMG",
      "AMG GT R",
      "G63",
      "SL63",
      "CLS63 AMG",
      "Sprinter 4x4",
      "Unimog",
    ],
  },
  {
    id: "brand-dodge",
    kind: "brand",
    title: "Custom Dodge T-Shirt",
    items: [
      "Challenger Hellcat",
      "Demon 170",
      "Charger Hellcat",
      "Viper GTS",
      "Durango SRT Hellcat",
      "Charger Daytona",
      "Challenger Scat Pack",
      "Magnum SRT8",
      "Ram SRT-10",
    ],
  },
  {
    id: "brand-subaru",
    kind: "brand",
    title: "Custom Subaru T-Shirt",
    items: [
      "WRX STI",
      "WRX VB",
      "BRZ",
      "Forester STI",
      "Legacy GT Spec B",
      "Impreza 22B",
      "Outback Wilderness",
      "Crosstrek Wilderness",
      "Levorg STI",
    ],
  },
  {
    id: "brand-mazda",
    kind: "brand",
    title: "Custom Mazda T-Shirt",
    items: [
      "RX-7 FD",
      "RX-7 FC",
      "RX-8",
      "MX-5 NA",
      "MX-5 ND",
      "Mazda3 Turbo",
      "Mazdaspeed6",
      "CX-5 Turbo",
      "Cosmo Sport",
    ],
  },
  {
    id: "brand-volkswagen",
    kind: "brand",
    title: "Custom Volkswagen T-Shirt",
    items: [
      "Golf GTI Mk1",
      "Golf GTI Mk8",
      "Golf R",
      "Scirocco R",
      "Beetle",
      "ID. Buzz",
      "Amarok",
      "Polo GTI",
      "Corrado VR6",
    ],
  },
  {
    id: "brand-jeep",
    kind: "brand",
    title: "Custom Jeep T-Shirt",
    items: [
      "Wrangler Rubicon",
      "Wrangler 392",
      "Gladiator Mojave",
      "Gladiator Rubicon",
      "Cherokee XJ",
      "Grand Cherokee Trackhawk",
      "Wagoneer",
      "CJ-7",
      "Renegade Trailhawk",
    ],
  },
];

export const ALL_CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  ...COMMUNITY_LISTINGS,
  ...BRAND_LISTINGS,
];

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
