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
  const id = categoryId ? categoryId.toUpperCase() : ""; 
  const classData = WEAPON_CLASSES[id];
  
  if (!classData) return 0;

  const multiplier = classData.multiplier;
  const attack = weapon.st?.atk || 0;
  const trueRaw = attack / multiplier;
  const affinity = getAffinityValue(weapon.st?.aff || 0);
  const affinityMod = 1 + (affinity / 100) * 0.25;
  
  let sharpMod = 1.0;
  const isRanged = id === "BW" || id === "LBG" || id === "HBG";
  
  if (!isRanged && weapon.st?.sh) {
    const sharpnessArray = isSharpnessPlus1 && weapon.st.sh.plus_1 ? weapon.st.sh.plus_1 : weapon.st.sh.base;
    const level = getSharpnessLevel(sharpnessArray);
    if (level >= 0 && level < SHARPNESS_MODIFIERS.length) {
      sharpMod = SHARPNESS_MODIFIERS[level].raw;
    }
  }
  
  let efr = trueRaw * sharpMod * affinityMod;
  
  // Weapon Specific Bonuses
  if (id === "SNS") {
    efr *= 1.06;
  }
  
  // Phial bonus for Switch Axe (SA)
  // In the new data, phial is an index in meta.phials
  // We need to know if it's "Fiole Puiss." (index 0 in meta.phials)
  if (id === "SA" && weapon.st?.ph === 0) {
    efr *= 1.25;
  }

  if (id === "LS") {
    efr *= 1.13;
  }
  
  return Math.floor(efr);
}

export function calculateEFE(weapon, isAwakened = false, isSharpnessPlus1 = false) {
  if (!weapon.st || !weapon.st.el) return 0;
  if (weapon.st.el.h && !isAwakened) return 0;
  
  const value = parseFloat(weapon.st.el.v);
  if (isNaN(value)) return 0;
  
  const trueElem = value / 10;
  
  let sharpMod = 1.0;
  if (weapon.st.sh) {
    const sharpnessArray = isSharpnessPlus1 && weapon.st.sh.plus_1 ? weapon.st.sh.plus_1 : weapon.st.sh.base;
    const level = getSharpnessLevel(sharpnessArray);
    if (level >= 0 && level < SHARPNESS_MODIFIERS.length) {
      sharpMod = SHARPNESS_MODIFIERS[level].elem;
    }
  }
  
  return Math.floor(trueElem * sharpMod);
}
