/**
 * MH3U WEAPON TREE - DATA SCHEMA & CONSTANTS
 * Software Architect Validation
 */

export const WEAPON_CLASSES = {
  GS: { name: "Great Sword", multiplier: 4.8 },
  LS: { name: "Long Sword", multiplier: 3.3 },
  SNS: { name: "Sword & Shield", multiplier: 1.4 },
  DB: { name: "Dual Blades", multiplier: 1.4 },
  HM: { name: "Hammer", multiplier: 5.2 },
  HH: { name: "Hunting Horn", multiplier: 4.6 },
  LN: { name: "Lance", multiplier: 2.3 },
  GL: { name: "Gunlance", multiplier: 2.3 },
  SA: { name: "Switch Axe", multiplier: 5.4 },
  LBG: { name: "Light Bowgun", multiplier: 1.3 },
  HBG: { name: "Heavy Bowgun", multiplier: 1.48 },
  BW: { name: "Bow", multiplier: 1.2 }
};

export const SHARPNESS_MODIFIERS = [
  { raw: 0.50, elem: 0.25 }, // Red
  { raw: 0.75, elem: 0.50 }, // Orange
  { raw: 1.00, elem: 0.75 }, // Yellow
  { raw: 1.05, elem: 1.00 }, // Green
  { raw: 1.20, elem: 1.06 }, // Blue
  { raw: 1.32, elem: 1.12 }, // White
  { raw: 1.50, elem: 1.20 }  // Purple
];

/**
 * EFR Calculation:
 * (Base Attack / Class Multiplier) * Sharpness Modifier * (1 + (Affinity/100 * 0.25))
 */
export function calculateEFR(attack, affinity, sharpnessLevel, classKey) {
  const baseRaw = attack / WEAPON_CLASSES[classKey].multiplier;
  const sharpMod = SHARPNESS_MODIFIERS[sharpnessLevel]?.raw || 1.0;
  const affinityMod = 1 + (affinity / 100 * 0.25);
  return Math.round(baseRaw * sharpMod * affinityMod);
}
