import type { MockupBase, MockupColor } from "./types";

export const BLANKET_NAME_FONT = "Great Vibes";

export function buildBlanketMockupPrompt(opts: {
  base: MockupBase;
  color: MockupColor;
  personalizationName?: string;
}): string {
  const { base, color, personalizationName } = opts;
  const fontInstruction = `Set the name in the ${BLANKET_NAME_FONT} typeface (Google Fonts) — flowing connected script with elegant swashes. Use ${BLANKET_NAME_FONT} consistently; do not copy a different font from the original image.`;
  const textColorInstruction = `Render the embroidered name text in ${color.textHex} thread colour so it contrasts clearly against the ${color.label} (${color.hex}) fleece fabric.`;
  const nameSpelling = personalizationName?.trim()
    ? `Spell the name "${personalizationName.trim()}".`
    : "Keep the same name spelling as the original image.";

  return [
    "Edit the first image, a product photograph of a folded fleece baby blanket styled on a round woven mat.",
    `Change the blanket fabric colour to ${color.label} (${color.hex}). Keep the identical fleece texture, fold lines, edge stitching, shadows and soft daylight.`,
    "Replace the printed artwork on the blanket with the artwork from the second image. Do not copy the vertical placement of the artwork or name from the first image.",
    "Place the artwork and embroidered name together as one design unit, centred horizontally on the visible folded blanket face. Reposition that entire unit much higher — roughly 5 cm above where it appears in the original photo. The name sits directly beneath the artwork with the same spacing between them.",
    `${textColorInstruction} ${fontInstruction} ${nameSpelling}`,
    "The bottom of the embroidered name must sit well above the lower horizontal fold seam. Leave a wide band of empty fleece below the name before the seam — at least one fifth of the blanket face height. The name must never crowd, touch, or sit near the bottom fold edge.",
    "Match a similar artwork scale and rotation. Let artwork and name follow the fabric surface and folds so they read as printed and embroidered on the fleece rather than pasted on top.",
    `Do not change the camera angle, framing or any surrounding prop: ${base.sceneDescription}. Add and remove nothing beyond the blanket colour, artwork, name placement and name styling. No watermarks or borders.`,
    "Output a clean, photorealistic commercial product photograph.",
  ].join(" ");
}

export const BLANKET_COLORS: MockupColor[] = [
  {
    id: "oatmeal-beige",
    label: "Oatmeal Beige",
    hex: "#E8DBCF",
    textHex: "#613a1c",
  },
  {
    id: "chocolate-brown",
    label: "Chocolate Brown",
    hex: "#6E5235",
    textHex: "#CCB495",
  },
  {
    id: "baby-blue",
    label: "Baby Blue",
    hex: "#96BFE7",
    textHex: "#052647",
  },
  {
    id: "baby-pink",
    label: "Baby Pink",
    hex: "#F4C2C2",
    textHex: "#ac4b52",
  },
  {
    id: "olive-green",
    label: "Olive Green",
    hex: "#A3B68A",
    textHex: "#313c1f",
  },
];

export const BLANKET_MOCKUP_BASE_SOURCE_URL =
  "https://v3b.fal.media/files/b/0aa82897/d8dZFMizaXim7ClnDDZIg_blanket-mockup-1.png";

export const BLANKET_SCENE_DESCRIPTION =
  "a round woven wicker tray, cream knitted cloth in a basket, green leaf sprig, neutral ceramic vase, wooden baby hairbrush, and wooden baby rattle on a light stone surface";
