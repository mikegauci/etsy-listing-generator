import { tagMatchesSubjectNiche } from "../../tags";

export type SlotVisualFn = (subject: string, product: string) => string;

export const MOTOR_ELEMENT_SLOT_VISUALS: Record<string, SlotVisualFn> = {
  "Featured Image": (s, p) =>
    `Hero mockup of a ${s} ${p} with Motor Element custom car-photo artwork front and center`,
  "Four Step Progress": (s, p) =>
    `Four-step progress graphic showing a ${s} photo transformed into custom ${p} artwork`,
  "Backgrounds Grid": (s, p) =>
    `Grid of theme background options behind a ${s} ${p} design preview`,
  "How to Order": (s, p) =>
    `How-to-order steps for personalizing a ${s} ${p} from your vehicle photo`,
  "No Background": (s, p) =>
    `Clean no-background ${s} illustration on a ${p} for a minimal custom look`,
  "Custom Background": (s, p) =>
    `Custom background scene paired with a ${s} ${p} car-photo illustration`,
  "Male Front Black Shirt": (s, p) =>
    `Male model front view in a black ${p} featuring a ${s} custom car print`,
  "Male Front White Shirt": (s, p) =>
    `Male model front view in a white ${p} featuring a ${s} custom car print`,
  "Female Front Black Shirt": (s, p) =>
    `Female model front view in a black ${p} featuring a ${s} custom car print`,
  "Female Front White Shirt": (s, p) =>
    `Female model front view in a white ${p} featuring a ${s} custom car print`,
  "Male Back Black Shirt": (s, p) =>
    `Male model back view in a black ${p} with a ${s} custom car print placement`,
  "Male Back White Shirt": (s, p) =>
    `Male model back view in a white ${p} with a ${s} custom car print placement`,
  "Female Back Black Shirt": (s, p) =>
    `Female model back view in a black ${p} with a ${s} custom car print placement`,
  "Female Back White Shirt": (s, p) =>
    `Female model back view in a white ${p} with a ${s} custom car print placement`,
  "The Perfect Gift": (s, p) =>
    `Gift-focused layout highlighting a ${s} ${p} as a personal automotive present`,
  "Material Info": (s, p) =>
    `Material and fabric details for a premium ${s} ${p} with durable custom print`,
  "T-Shirt Sizes": (s, p) =>
    `Size chart guidance for ordering the right fit on a ${s} ${p}`,
};

export function motorElementSlotBonus(
  slot: string,
  subject: string,
  product: string
): string[] {
  const niche =
    subject
      .replace(/^custom\s+/i, "")
      .replace(/\s+(t-?shirts?|tees?|hoodies?)$/i, "")
      .trim() || subject;
  const short = niche.split(/\s+/).slice(0, 2).join(" ") || niche;
  const productWord = product.replace(/-/g, " ").trim() || "shirt";

  const bySlot: Record<string, string[]> = {
    "Featured Image": [`${short} mockup`, `custom ${short}`, `${short} apparel`],
    "Four Step Progress": [
      `${short} process`,
      `photo to ${productWord}`,
      `custom art process`,
    ],
    "Backgrounds Grid": [
      `${short} background`,
      `car photo background`,
      `theme background shirt`,
    ],
    "How to Order": [
      `order custom ${productWord}`,
      `${short} personalization`,
      `custom order shirt`,
    ],
    "No Background": [
      `${short} no background`,
      `minimal car shirt`,
      `clean car illustration`,
    ],
    "Custom Background": [
      `custom scene shirt`,
      `${short} scene art`,
      `personalized backdrop`,
    ],
    "Male Front Black Shirt": [
      `mens ${short} shirt`,
      `black ${productWord} mockup`,
      `${short} front print`,
    ],
    "Male Front White Shirt": [
      `mens white ${productWord}`,
      `${short} tee mockup`,
      `white car shirt`,
    ],
    "Female Front Black Shirt": [
      `womens ${short} shirt`,
      `black tee for her`,
      `${short} ladies tee`,
    ],
    "Female Front White Shirt": [
      `womens white ${productWord}`,
      `${short} for her`,
      `ladies car shirt`,
    ],
    "Male Back Black Shirt": [
      `back print ${short}`,
      `mens back ${productWord}`,
      `${short} back design`,
    ],
    "Male Back White Shirt": [
      `white back print tee`,
      `${short} rear print`,
      `mens back design`,
    ],
    "Female Back Black Shirt": [
      `womens back print`,
      `${short} back tee`,
      `ladies back design`,
    ],
    "Female Back White Shirt": [
      `womens white back`,
      `${short} rear tee`,
      `ladies back print`,
    ],
    "The Perfect Gift": [
      `${short} present`,
      `car lover gift`,
      `automotive birthday gift`,
      `fathers day car gift`,
    ],
    "Material Info": [
      `soft ${productWord} print`,
      `premium ${short} tee`,
      `quality car apparel`,
    ],
    "T-Shirt Sizes": [
      `${short} size chart`,
      `${productWord} sizing guide`,
      `unisex car tee sizes`,
    ],
  };

  return (bySlot[slot] || [`${short} ${productWord}`, `${short} gift`]).filter(
    (p) =>
      tagMatchesSubjectNiche(p, niche) ||
      /\b(gift|mockup|print|size|background|process|order|mens|womens|ladies|premium|quality|soft|unisex|front|back|white|black|minimal|clean|theme|scene|art|apparel|tee|shirt)\b/i.test(
        p
      )
  );
}

export const MOTOR_ELEMENT_SLOT_BONUS = motorElementSlotBonus;
