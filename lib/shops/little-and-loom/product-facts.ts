export const LOOM_BLANKET_COLORS = [
  "Oatmeal Beige",
  "Chocolate Brown",
  "Baby Blue",
  "Baby Pink",
  "Olive Green",
] as const;

export const LOOM_DESIGN_OPTIONS = [
  {
    label: "Blanket Only",
    detail: "A plain blanket with no text or artwork.",
  },
  {
    label: "Text + Design + Blanket",
    detail:
      "Includes your personalized text together with the illustrated design.",
  },
  {
    label: "Design Only",
    detail: "Includes the artwork without personalized text.",
  },
  {
    label: "Text Only",
    detail:
      "Includes your chosen personalized text without the illustrated design.",
  },
] as const;

export const LOOM_TEXT_COLORS = [
  "Beige (default)",
  "Navy Blue",
  "Dark Pink",
  "White",
  "Chocolate Brown",
  "Dark Green",
] as const;

export const LOOM_NO_TEXT_OPTION = "None (No Text)";

export const LOOM_HOW_TO_PERSONALIZE = [
  "Choose your preferred blanket color.",
  "Select your preferred option: Blanket Only, Text + Design + Blanket, Design Only or Text Only.",
  "Choose your text color where applicable.",
  "Enter the baby's name or personalized text exactly as you would like it printed.",
  "Double-check the spelling and capitalization.",
  "Add your personalized blanket to your cart and complete checkout.",
] as const;

export const LOOM_PERFECT_FOR = [
  "Baby shower gifts",
  "Newborn gifts",
  "Personalized baby gifts",
  "New baby celebrations",
  "Nursery decor",
  "Birth announcements",
  "Stroller outings",
  "Milestone photos",
  "First birthdays",
  "Gifts for new parents",
  "Grandchildren, nieces, nephews and godchildren",
] as const;

export const LOOM_PRODUCT_DETAILS = [
  "100% durable polyester",
  "Ultra-soft velveteen plush texture",
  "Vibrant one-sided printed design",
  "Bright and crisp colors",
  'Reinforced 2" stitched hem for durable edges',
  "Lightweight and quick drying",
  "Available in three sizes",
] as const;

export const LOOM_CARE_INSTRUCTIONS = [
  "Machine wash cold, max 30°C / 90°F",
  "Use a gentle cycle",
  "Hand washing can help extend the quality of the blanket",
  "Do not bleach",
  "Tumble dry on low heat",
  "Do not iron",
  "Do not dry clean",
] as const;

export const LOOM_PLEASE_NOTE = [
  "If you select Blanket Only, no text or artwork will be printed.",
  "If you select Design Only, please choose None (No Text) under Text Color.",
  "If you select Text Only or Text + Design + Blanket, please select your preferred text color.",
  "Colors may appear slightly different in person due to differences in screen and monitor settings.",
  "Artwork placement and scale may vary slightly depending on the blanket size selected.",
  "This is a printed design and is not embroidered.",
  "Please carefully check the spelling of any personalized text before placing your order.",
  "Lifestyle photographs are styled to show the product in use and may not represent the exact scale of every blanket size.",
] as const;

export const LOOM_SECTION_HEADINGS = {
  whyYoullLoveIt: "✨ WHY YOU'LL LOVE IT",
  blanketColors: "🎨 BLANKET COLORS",
  designOptions: "🖌️ DESIGN OPTIONS",
  textColors: "🌈 TEXT COLORS",
  howToPersonalize: "✏️ HOW TO PERSONALIZE",
  perfectFor: "🎁 PERFECT FOR",
  productDetails: "🧵 PRODUCT DETAILS",
  careInstructions: "🧺 CARE INSTRUCTIONS",
  pleaseNote: "⚠️ PLEASE NOTE",
  questions: "💌 QUESTIONS OR SPECIAL REQUESTS?",
} as const;

function bullets(items: readonly string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

export function loomBlanketColorsBlock(): string {
  return [
    LOOM_SECTION_HEADINGS.blanketColors,
    "",
    "Choose from:",
    "",
    bullets(LOOM_BLANKET_COLORS),
  ].join("\n");
}

export function loomDesignOptionsBlock(): string {
  return [
    LOOM_SECTION_HEADINGS.designOptions,
    "",
    "Choose the finish that works best for you:",
    "",
    LOOM_DESIGN_OPTIONS.map(
      (option) => `• ${option.label}\n${option.detail}`
    ).join("\n\n"),
  ].join("\n");
}

export function loomTextColorsBlock(): string {
  return [
    LOOM_SECTION_HEADINGS.textColors,
    "",
    "If your chosen option includes personalized text, select from:",
    "",
    bullets(LOOM_TEXT_COLORS),
    "",
    "If you choose an option without text, select:",
    "",
    `• ${LOOM_NO_TEXT_OPTION}`,
  ].join("\n");
}

export function loomHowToPersonalizeBlock(): string {
  return [
    LOOM_SECTION_HEADINGS.howToPersonalize,
    "",
    LOOM_HOW_TO_PERSONALIZE.map((step, i) => `${i + 1}. ${step}`).join("\n"),
    "",
    "Your text will be printed exactly as entered, so please carefully check all spelling before placing your order.",
  ].join("\n");
}

export function loomPerfectForBlock(): string {
  return [LOOM_SECTION_HEADINGS.perfectFor, "", bullets(LOOM_PERFECT_FOR)].join(
    "\n"
  );
}

export function loomProductDetailsBlock(): string {
  return [
    LOOM_SECTION_HEADINGS.productDetails,
    "",
    bullets(LOOM_PRODUCT_DETAILS),
  ].join("\n");
}

export function loomCareInstructionsBlock(): string {
  return [
    LOOM_SECTION_HEADINGS.careInstructions,
    "",
    bullets(LOOM_CARE_INSTRUCTIONS),
  ].join("\n");
}

export function loomClosingCopy(): string {
  return [
    LOOM_SECTION_HEADINGS.pleaseNote,
    "",
    bullets(LOOM_PLEASE_NOTE),
    "",
    LOOM_SECTION_HEADINGS.questions,
    "",
    "If you have any questions about colors, personalization or your chosen design, feel free to send us a message before ordering. We'd be happy to help create something special for your little one.",
  ].join("\n");
}
