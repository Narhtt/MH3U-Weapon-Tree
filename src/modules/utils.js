/**
 * MH3U WEAPON TREE - UTILS
 * Formulas and multipliers for Monster Hunter 3 Ultimate
 */

import { WEAPON_CLASSES, SHARPNESS_MODIFIERS } from './constants.js';

export function getSharpnessLevel(sharpnessArray) {
  if (!sharpnessArray) return -1;
  let level = -1;
  for (let i = 0; i < sharpnessArray.length; i++) {
    if (sharpnessArray[i] > 0) level = i;
  }
  return level;
}

export function getAffinityValue(affinity) {
  if (affinity === undefined) return 0;
  if (typeof affinity === 'string') {
    return parseFloat(affinity.replace('%', ''));
  }
  return affinity;
}

export function calculateEFR(weapon, categoryId, isSharpnessPlus1 = false) {
  const classData = WEAPON_CLASSES[categoryId];
  if (!classData) return 0;

  const multiplier = classData.multiplier;
  const trueRaw = weapon.stats.attack / multiplier;
  const affinity = getAffinityValue(weapon.stats.affinity);
  const affinityMod = 1 + (affinity / 100) * 0.25;
  
  let sharpMod = 1.0;
  const isRanged = categoryId === "BW" || categoryId === "LBG" || categoryId === "HBG";
  
  if (!isRanged && weapon.stats.sharpness) {
    const sharpnessArray = isSharpnessPlus1 && weapon.stats.sharpness.plus_1 ? weapon.stats.sharpness.plus_1 : weapon.stats.sharpness.base;
    const level = getSharpnessLevel(sharpnessArray);
    if (level >= 0 && level < SHARPNESS_MODIFIERS.length) {
      sharpMod = SHARPNESS_MODIFIERS[level].raw;
    }
  }
  
  let efr = trueRaw * sharpMod * affinityMod;
  
  // Weapon Specific Bonuses
  if (categoryId === "SnS") {
    efr *= 1.06;
  }
  
  if (categoryId === "SA" && weapon.stats.phial && (weapon.stats.phial.includes("Force") || weapon.stats.phial.includes("Puiss"))) {
    efr *= 1.25;
  }

  if (categoryId === "LS") {
    efr *= 1.13;
  }
  
  return Math.floor(efr);
}

export function calculateEFE(weapon, isAwakened = false, isSharpnessPlus1 = false) {
  if (!weapon.stats || !weapon.stats.element) return 0;
  if (weapon.stats.element.hidden && !isAwakened) return 0;
  
  const value = parseFloat(weapon.stats.element.value);
  if (isNaN(value)) return 0;
  
  const trueElem = value / 10;
  
  let sharpMod = 1.0;
  if (weapon.stats.sharpness) {
    const sharpnessArray = isSharpnessPlus1 && weapon.stats.sharpness.plus_1 ? weapon.stats.sharpness.plus_1 : weapon.stats.sharpness.base;
    const level = getSharpnessLevel(sharpnessArray);
    if (level >= 0 && level < SHARPNESS_MODIFIERS.length) {
      sharpMod = SHARPNESS_MODIFIERS[level].elem;
    }
  }
  
  return Math.floor(trueElem * sharpMod);
}
