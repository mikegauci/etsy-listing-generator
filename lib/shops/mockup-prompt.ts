import type { MockupBase, MockupColor } from "./types";

export const BLANKET_NAME_FONT = "Great Vibes";

export function buildBlanketMockupPrompt(opts: {
  base: MockupBase;
  color: MockupColor;
  personalizationName?: string;
}): string {
  const { base, color, personalizationName } = opts;
  const fontInstruction = `Use the ${BLANKET_NAME_FONT} script typeface.`;
  const textColorInstruction = `Render the name in ${color.textHex} against the ${color.label} (${color.hex}) fleece.`;
  const nameSpelling = personalizationName?.trim()
    ? `Spell the name "${personalizationName.trim()}".`
    : "Keep the same name spelling as the original image.";

  return [
    "Edit the first image: a folded fleece baby blanket on a round woven mat.",
    `Change only the blanket colour to ${color.label} (${color.hex}), swap in the artwork from the second image, and set the embroidered name. ${textColorInstruction} ${fontInstruction} ${nameSpelling}`,
    "Keep the first image unchanged otherwise — same crop, camera, lighting, blanket size, folds, and props.",
    `Props to preserve: ${base.sceneDescription}.`,
    "Place artwork and name as one unit in the exact same print zone as the original design on the first image — same position, scale, and rotation. Name directly below artwork. Leave clear empty fleece below the name; it must never touch or crowd the lower fold edge.",
    "Artwork and name must follow the fabric folds so they look printed on the fleece, not pasted on.",
    "No watermarks or borders.",
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
