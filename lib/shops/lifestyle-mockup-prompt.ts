import type { LifestyleScene, MockupColor } from "./types";
import { BLANKET_NAME_FONT } from "./mockup-prompt";

export const LIFESTYLE_SCENES: LifestyleScene[] = [
  {
    id: "crib-baby-closeup",
    label: "Crib close-up with sleeping baby",
    hasBaby: true,
    sceneDescription:
      "A cozy wooden crib in a soft neutral nursery. A peacefully sleeping baby lies under a thick plush velveteen blanket; only the baby's head and tiny hands are softly blurred at the top edge of frame. The blanket hangs over the crib rail with a broad flat printed face toward the camera — not folded into a corner. Tight close-up crop on the flat bottom-center print zone, warm side daylight.",
  },
  {
    id: "moses-basket",
    label: "Wicker moses basket drape",
    hasBaby: false,
    sceneDescription:
      "A round woven wicker moses basket on a light nursery floor. A thick plush velveteen blanket with square corners is draped over the basket edge with the bottom printed face toward the camera. Tight close-up crop zoomed into the print zone; basket and props fall to soft blurred periphery. Gentle daylight.",
  },
  {
    id: "crib-no-baby",
    label: "Crib rail drape, empty crib",
    hasBaby: false,
    sceneDescription:
      "An empty wooden crib in a clean neutral nursery. A thick plush velveteen blanket with square corners is folded over the crib rail with the bottom printed face toward the camera. Tight close-up crop on the print zone; crib rails blur at the edges. Soft natural window light.",
  },
  {
    id: "nursery-rocker",
    label: "Blanket draped on nursery rocker",
    hasBaby: false,
    sceneDescription:
      "An upholstered nursery rocking chair with a thick plush velveteen blanket draped over the arm. The blanket presents a broad flat printed face toward the camera — not bunched into a corner fold. Tight close-up crop on the flat bottom-center print zone; chair blurs at the periphery. Warm afternoon light.",
  },
  {
    id: "bassinet-soft-light",
    label: "Bassinet with sleeping newborn",
    hasBaby: true,
    sceneDescription:
      "A white bassinet with a softly sleeping newborn partially covered by a thick plush velveteen blanket. Tight close-up crop on the lower printed portion in the foreground; baby softly blurred at the top edge. Gentle morning light.",
  },
  {
    id: "bassinet-blanket-over-baby",
    label: "Bassinet with blanket over baby",
    hasBaby: true,
    sceneDescription:
      "A peacefully sleeping newborn in a shallow oval woven bassinet. A thick plush velveteen blanket with square corners covers the baby from the chest down, folded horizontally across the chest with only the baby's head and one small hand softly visible at the top edge of frame. Tight close-up crop zoomed into the bottom print zone between the chest fold and lower hem — modest print on the fabric, artwork hero through camera framing. Gentle side daylight.",
  },
];

function blanketMaterialBlock(color: MockupColor): string {
  return [
    `The blanket is ${color.label} (${color.hex}) velveteen microfiber — a thick, plush, premium baby blanket.`,
    "Material must look like soft velveteen microfiber with a visible plush pile and gentle velvety sheen — NOT thin, NOT flat, NOT terry-towel, NOT a lightweight sheet or swaddle cloth.",
    "Show substantial thickness and weight: soft rounded folds, cushioned drape, and a fluffy hand-feel where the fabric bunches.",
    "The surface has a short dense nap that catches soft light; folds reveal depth and body in the fabric.",
    "Reinforced stitched hem around the edges — the blanket reads as a cozy, high-quality personalized throw.",
  ].join(" ");
}

function cameraFramingBlock(): string {
  return [
    "Frame the shot as a tight close-up zoomed into the bottom-center print zone — the artwork should dominate the photograph even though it stays modestly sized on the fabric.",
    "Do not make the artwork larger on the blanket; instead move the camera closer and crop tighter so the print area fills most of the image frame.",
    "The artwork plus name should occupy roughly 50% to 70% of the image height through framing alone, with only minimal surrounding blanket and scene visible at the edges.",
    "Crop out wide room views — keep nursery props, furniture, and background to soft blurred periphery or out of frame entirely.",
    "Use shallow depth of field: razor-sharp focus on the artwork and name, everything else falls into creamy bokeh.",
  ].join(" ");
}
function blanketShapeBlock(): string {
  return [
    "The blanket is a rectangular baby throw with four square 90-degree corners.",
    "Corners must be sharp and straight — no rounded corners, no curved edges, no scalloped hems, no mitered round corners.",
    "Straight hemmed edges with a simple stitched border only.",
  ].join(" ");
}

function artworkScaleBlock(sceneId?: string): string {
  const compact =
    sceneId === "bassinet-blanket-over-baby" ||
    sceneId === "crib-baby-closeup" ||
    sceneId === "bassinet-soft-light";
  if (compact) {
    return [
      "Scale the artwork down significantly on the fabric — the full design unit (artwork plus name) should span only about 30% to 40% of the visible blanket width.",
      "The design must look modest and boutique-sized, not oversized — never fill the visible blanket face.",
      "Leave wide empty velveteen margins above, beside, and below the design within the print zone.",
    ].join(" ");
  }
  return [
    "Scale the artwork down on the fabric — the full design unit (artwork plus name) should span roughly 35% to 45% of the blanket width.",
    "Keep the design modest and proportionate to a real personalized baby blanket print — not oversized, not edge-to-edge.",
    "Leave generous empty velveteen margins on all sides of the design within the bottom third.",
  ].join(" ");
}

function drapedPrintPlacementBlock(sceneId: string): string | null {
  if (sceneId !== "crib-baby-closeup" && sceneId !== "nursery-rocker") {
    return null;
  }
  return [
    "This is a draped blanket scene — fold and orient the blanket so the bottom-center print sits on a broad, flat, open face of fabric facing the camera.",
    "The artwork must never sit on a folded corner, triangular crease, or where two fold lines meet. Do not tuck the print into the corner of the drape.",
    "Keep the design on the flat central panel of the visible blanket with equal empty fabric on both sides — it must read as bottom-center on the blanket, not bottom-left or bottom-right.",
    "Avoid compositions where folds, rails, or chair arms push the artwork into the corner of the image frame. The print zone should feel centered and front-facing.",
  ].join(" ");
}

function artworkPlacementBlock(sceneId?: string): string {
  return [
    "Use the artwork from the reference image exactly — reproduce every graphic detail faithfully; do not redraw, simplify, or invent new elements.",
    "The blanket has a fixed print orientation: the top half to two-thirds of the blanket face is blank solid velveteen; the artwork lives only in the bottom third.",
    "Place the artwork and any name text together as one design unit at the BOTTOM CENTER of the blanket face — horizontally centered, anchored to the lower third.",
    artworkScaleBlock(sceneId),
    "Do not center the artwork vertically on the blanket or in the middle of the visible drape. The top of the artwork must sit well below the vertical midpoint of the blanket face.",
    "Leave a wide band of empty velveteen above the artwork. The bottom of the name sits just above the lower hem with a small margin — never at the vertical center of the blanket.",
    "When the blanket is draped or folded, orient it so this bottom-center print zone faces the camera clearly.",
    "The artwork area must be the sharpest focal point in the frame.",
    "Let the artwork follow the blanket folds and velveteen microfiber pile so it reads as printed on the plush fabric, not pasted on top.",
  ].join(" ");
}

function nameInstruction(
  color: MockupColor,
  personalizationName?: string
): string {
  const fontInstruction = `Set the name in the ${BLANKET_NAME_FONT} typeface — flowing connected script with elegant swashes.`;
  const textColorInstruction = `Render the name in ${color.textHex} so it contrasts clearly against the ${color.label} (${color.hex}) velveteen microfiber.`;
  const nameSpelling = personalizationName?.trim()
    ? `Spell the name "${personalizationName.trim()}".`
    : "If the reference artwork includes a name, keep that exact spelling.";
  return `${textColorInstruction} ${fontInstruction} ${nameSpelling} Place the name directly beneath the artwork as part of the bottom-center unit — never above the artwork or at the vertical center of the blanket.`;
}

function babySafetyInstruction(): string {
  return "If a baby appears, show a peacefully sleeping, fully clothed infant with no face close-up and no exposed skin beyond hands or forehead. Keep the baby softly out of focus in the background.";
}

export function buildLifestyleMockupPrompt(opts: {
  scene: LifestyleScene;
  color: MockupColor;
  personalizationName?: string;
}): string {
  const { scene, color, personalizationName } = opts;

  return [
    `Generate a photorealistic square 1:1 commercial product photograph for an Etsy listing.`,
    `Scene: ${scene.sceneDescription}`,
    scene.hasBaby ? babySafetyInstruction() : "",
    blanketMaterialBlock(color),
    blanketShapeBlock(),
    artworkPlacementBlock(scene.id),
    drapedPrintPlacementBlock(scene.id),
    cameraFramingBlock(),
    nameInstruction(color, personalizationName),
    "No watermarks, borders, or text overlays beyond the product personalization.",
    "Output a polished lifestyle hero image suitable as a featured listing photo.",
  ]
    .filter(Boolean)
    .join(" ");
}
