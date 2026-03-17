/**
 * MH3U WEAPON TREE - ICONS
 * Dynamic SVG library
 */

export const ICONS = {
  hammer: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.7,4.7C0.6,7.1 1,10.1 3,12.1C4.9,14 7.6,14.5 9.9,13.6L19,22.7L22.7,19Z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.11,13 12,13A2,2 0 0,0 10,15C10,16.11 10.89,17 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.97 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.97 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.95C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.95L19.05,18.93C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>`,
  upgrade: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7,14L12,9L17,14H7Z"/></svg>`,
  checkmark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5,16L3,5L8.5,10L12,4L15.5,10L21,5L19,16H5M19,19A1,1 0 0,1 18,20H6A1,1 0 0,1 5,19V18H19V19Z"/></svg>`,
  hammer_small: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.7,4.7C0.6,7.1 1,10.1 3,12.1C4.9,14 7.6,14.5 9.9,13.6L19,22.7C19.4,23.1 20,23.1 20.4,22.7L22.7,20.4C23.1,20 23.1,19.4 22.7,19Z"/></svg>`,
  shield_small: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/></svg>`
};

export const WEAPON_TYPES = [
  { id: "GS", name: "Grande épée", icon: "Great_Sword" },
  { id: "LS", name: "Épée longue", icon: "Long_Sword" },
  { id: "SnS", name: "Épée & bouclier", icon: "Sword_&_Shield" },
  { id: "DB", name: "Lames doubles", icon: "Dual_Blades" },
  { id: "HM", name: "Marteau", icon: "Hammer" },
  { id: "HH", name: "Corne de chasse", icon: "Hunting_Horn" },
  { id: "LN", name: "Lance", icon: "Lance" },
  { id: "GL", name: "Lancecanon", icon: "Gunlance" },
  { id: "SA", name: "Morpho-hache", icon: "Switch_Axe" },
  { id: "LBG", name: "Fusarbalète léger", icon: "Light_Bowgun" },
  { id: "HBG", name: "Fusarbalète lourd", icon: "Heavy_Bowgun" },
  { id: "BW", name: "Arc", icon: "Bow" }
];

export function getWeaponIconPath(iconName, rarity = 1) {
  const rankStr = Math.min(Math.max(rarity, 1), 10).toString().padStart(2, "0");
  return `/icons/Weapons/${iconName}/${iconName}_Rank_${rankStr}.svg`;
}
