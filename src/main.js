/**
 * MH3U WEAPON TREE - MAIN ORCHESTRATOR
 * Vanilla JS | Premium UI | Modern Standards
 */

import { ICONS, WEAPON_TYPES, getWeaponIconPath } from './modules/icons.js';
import { calculateEFR, calculateEFE } from './modules/utils.js';

class App {
  constructor() {
    this.weaponsData = {};
    this.currentCategory = null;
    this.collectedWeapons = JSON.parse(localStorage.getItem("mh3u_collected")) || [];
    
    this.elements = {
      treeViewport: document.getElementById('tree-viewport'),
      treeCanvas: document.getElementById('tree-canvas'),
      treeNodes: document.getElementById('tree-nodes'),
      treeConnections: document.getElementById('tree-connections'),
      homeOverlay: document.getElementById('home-overlay'),
      weaponTypeGrid: document.getElementById('weapon-type-grid'),
      weaponModal: document.getElementById('weapon-modal'),
      modalContent: document.getElementById('modal-content'),
      closeModal: document.getElementById('close-modal'),
      homeBtn: document.getElementById('home-btn')
    };

    // Update Home Button Icon
    const homeIcon = this.elements.homeBtn.querySelector('.btn-icon');
    if (homeIcon) homeIcon.innerHTML = ICONS.home;

    this.init();
    this.setupResizeObserver();
  }

  setupResizeObserver() {
    // Redraw connections whenever the tree nodes container changes size
    const observer = new ResizeObserver(() => {
      if (this.currentCategory) {
        this.drawConnections();
      }
    });
    observer.observe(this.elements.treeNodes);
  }

  toggleCollection(weaponId) {
    const index = this.collectedWeapons.indexOf(weaponId);
    if (index > -1) {
      this.collectedWeapons.splice(index, 1);
    } else {
      this.collectedWeapons.push(weaponId);
    }
    localStorage.setItem("mh3u_collected", JSON.stringify(this.collectedWeapons));
    
    // Update UI for all instances of this weapon card
    const cards = document.querySelectorAll(`.weapon-card[data-id="${weaponId}"]`);
    cards.forEach(card => {
      card.classList.toggle('is-collected', this.collectedWeapons.includes(weaponId));
      const checkbox = card.querySelector('.collection-checkbox');
      if (checkbox) checkbox.checked = this.collectedWeapons.includes(weaponId);
    });
  }

  async init() {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('Service Worker Registered', reg.scope))
          .catch(err => console.log('Service Worker Registration Failed', err));
      });
    }

    try {
      const response = await fetch("/data/mh3u_weapons_data_final.json");
      this.weaponsData = await response.json();
      this.renderHomeMenu();
      this.bindEvents();
      console.log("MH3U Database Loaded Successfully");
    } catch (error) {
      console.error("Failed to load weapon database:", error);
    }
  }

  bindEvents() {
    this.elements.homeBtn.addEventListener('click', () => this.showHome());
    this.elements.closeModal.addEventListener('click', () => this.elements.weaponModal.close());
    
    // Close modal on backdrop click
    this.elements.weaponModal.addEventListener('click', (e) => {
      if (e.target === this.elements.weaponModal) this.elements.weaponModal.close();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.elements.homeOverlay.classList.contains('hidden')) {
        // Optional: handle escape
      }
    });

    // Redraw connections on window resize
    window.addEventListener('resize', () => {
      if (this.currentCategory) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.drawConnections(), 150);
      }
    });
  }

  renderHomeMenu() {
    this.elements.weaponTypeGrid.innerHTML = WEAPON_TYPES.map(type => `
      <div class="weapon-type-card" data-category="${type.name}" data-id="${type.id}">
        <img src="${getWeaponIconPath(type.icon, 1)}" alt="${type.name}" referrerPolicy="no-referrer">
        <span>${type.name}</span>
      </div>
    `).join('');

    this.elements.weaponTypeGrid.querySelectorAll('.weapon-type-card').forEach(card => {
      card.addEventListener('click', () => {
        const category = card.dataset.category;
        const categoryId = card.dataset.id;
        this.loadCategory(category, categoryId);
      });
    });
  }

  showHome() {
    this.elements.homeOverlay.classList.remove('hidden');
    this.currentCategory = null;
    this.currentCategoryId = null;
  }

  loadCategory(category, categoryId) {
    this.currentCategory = category;
    this.currentCategoryId = categoryId;
    this.elements.homeOverlay.classList.add('hidden');
    this.renderTree(category, categoryId);
  }

  renderTree(category, categoryId) {
    // Robust category matching
    const normalize = (str) => str.normalize('NFC').toLowerCase().trim();
    const categoryKey = Object.keys(this.weaponsData).find(
      key => normalize(key) === normalize(category)
    );
    
    const weapons = categoryKey ? this.weaponsData[categoryKey] : null;
    
    if (!weapons || weapons.length === 0) {
      console.warn(`No weapons found for category: ${category}`);
      this.elements.treeNodes.innerHTML = `<div class="error-msg">Aucune donnée pour ${category}</div>`;
      return;
    }

    // Clear previous positioning and content
    this.elements.treeNodes.innerHTML = '';
    this.elements.treeConnections.innerHTML = '';

    // Create a local map for fast lookup
    this.currentWeaponMap = new Map();
    weapons.forEach(w => this.currentWeaponMap.set(w.id, w));

    // 1. Identify Root weapons
    const rootWeapons = weapons.filter(w => 
      !w.parent_id || 
      w.parent_id === "" || 
      w.parent_id === "None" || 
      !this.currentWeaponMap.has(w.parent_id)
    );

    // 2. Calculate Relative Depth and Subtree Height
    const calculateMetrics = (weapon, relDepth = 1) => {
      const parent = this.currentWeaponMap.get(weapon.parent_id);
      if (!parent || parent.rarity !== weapon.rarity) {
        weapon.relDepth = 1;
      } else {
        weapon.relDepth = relDepth;
      }

      const children = (weapon.children_ids || [])
        .map(id => this.currentWeaponMap.get(id))
        .filter(Boolean);
      
      if (children.length === 0) {
        weapon.subtreeHeight = 1;
        return 1;
      }

      let height = 0;
      children.forEach(child => {
        const nextRelDepth = (child.rarity === weapon.rarity) ? weapon.relDepth + 1 : 1;
        height += calculateMetrics(child, nextRelDepth);
      });
      weapon.subtreeHeight = height;
      return height;
    };

    rootWeapons.forEach(root => calculateMetrics(root));

    // 3. Calculate Max Relative Depth per Rarity
    const maxRelDepths = {};
    for (let r = 1; r <= 10; r++) maxRelDepths[r] = 0;
    weapons.forEach(w => {
      const r = w.rarity || 1;
      if (w.relDepth > maxRelDepths[r]) maxRelDepths[r] = w.relDepth;
    });

    // 4. Calculate Rarity Offsets
    const rarityOffsets = {};
    let currentOffset = 1;
    for (let r = 1; r <= 10; r++) {
      if (maxRelDepths[r] > 0) {
        rarityOffsets[r] = currentOffset;
        currentOffset += maxRelDepths[r];
      }
    }

    const totalColumns = currentOffset - 1;
    this.elements.treeNodes.style.gridTemplateColumns = `repeat(${totalColumns}, 320px)`;

    // 5. Add Rarity Headers with Spans
    Object.entries(rarityOffsets).forEach(([rarity, offset]) => {
      const r = parseInt(rarity);
      const span = maxRelDepths[r];
      const header = document.createElement('div');
      header.className = 'rarity-header';
      header.textContent = `Rareté ${rarity}`;
      header.style.gridColumn = `${offset} / span ${span}`;
      header.style.gridRow = 1;
      this.elements.treeNodes.appendChild(header);
    });

    // 6. Assign Rows
    let currentRow = 2; // Start after headers
    const assignRows = (weapon, rowOffset) => {
      weapon.row = rowOffset;
      weapon.col = rarityOffsets[weapon.rarity || 1] + (weapon.relDepth || 1) - 1;

      const children = (weapon.children_ids || [])
        .map(id => this.currentWeaponMap.get(id))
        .filter(Boolean);
      
      let nextRowOffset = rowOffset;
      children.forEach(child => {
        assignRows(child, nextRowOffset);
        nextRowOffset += child.subtreeHeight;
      });
    };

    rootWeapons.forEach(root => {
      assignRows(root, currentRow);
      currentRow += root.subtreeHeight;
    });

    // 7. Render Nodes
    weapons.forEach(weapon => {
      if (weapon.col !== undefined && weapon.row !== undefined) {
        const node = this.createWeaponNode(weapon, category, categoryId);
        node.style.gridColumn = weapon.col;
        node.style.gridRow = weapon.row;
        this.elements.treeNodes.appendChild(node);
      }
    });

    // Draw connections after a short delay to ensure DOM is ready
    requestAnimationFrame(() => this.drawConnections());
  }

  createWeaponNode(weapon, category, categoryId) {
    const isCollected = this.collectedWeapons.includes(weapon.id);
    const div = document.createElement('div');
    div.className = `weapon-card ${isCollected ? 'is-collected' : ''}`;
    div.dataset.id = weapon.id;
    div.dataset.rarity = weapon.rarity;
    
    const iconPath = getWeaponIconPath(this.getIconFolder(category), weapon.rarity);
    const efr = calculateEFR(weapon, categoryId);
    const efe = calculateEFE(weapon);
    
    const element = weapon.stats.element;
    const elementHtml = element && element.type ? `
      <span class="node-element-tag ${element.type.toLowerCase()}" style="background: ${this.getElementColor(element.type)}; color: #fff;">
        ${element.type.charAt(0).toUpperCase()}
      </span>
    ` : '';

    const affinityHtml = weapon.stats.affinity && weapon.stats.affinity !== 0 ? `
      <span style="color: ${weapon.stats.affinity > 0 ? '#44ff44' : '#ff4444'}; font-size: 0.7rem;">
        Aff. ${weapon.stats.affinity > 0 ? '+' : ''}${weapon.stats.affinity}%
      </span>
    ` : '';

    const defenseHtml = weapon.stats.defense && weapon.stats.defense !== 0 ? `
      <span style="color: #4488ff; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 2px;">
        <span style="width: 12px; height: 12px; display: inline-block;">${ICONS.shield_small}</span> ${weapon.stats.defense > 0 ? '+' : ''}${weapon.stats.defense}
      </span>
    ` : '';

    const forgeIcon = weapon.is_forgeable ? `<div class="forge-icon" title="Forgeable"><span style="width: 16px; height: 16px; display: block;">${ICONS.hammer_small}</span></div>` : '';

    div.innerHTML = `
      <div class="node-header">
        <img src="${iconPath}" class="node-icon" alt="" referrerPolicy="no-referrer">
        <div class="node-title">
          <span class="node-name">${weapon.name}</span>
          <div class="node-meta">
            <span class="node-atk">ATK ${weapon.stats.attack}</span>
            ${defenseHtml ? `| ${defenseHtml}` : ''}
            ${affinityHtml ? `| ${affinityHtml}` : ''}
          </div>
        </div>
      </div>
      
      <div class="node-footer">
        <div class="efr-badge">
          EFR: ${efr}${efe > 0 ? ` | EFE: ${efe}` : ''}
        </div>
        ${elementHtml}
      </div>

      <input type="checkbox" class="collection-checkbox" ${isCollected ? 'checked' : ''} title="Possédée">
      ${forgeIcon}
    `;

    // Collection toggle
    const checkbox = div.querySelector('.collection-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollection(weapon.id);
    });

    // Interaction for line highlighting
    div.addEventListener('mouseenter', () => {
      const connections = this.elements.treeConnections.querySelectorAll(`.connection-line[data-start="${weapon.id}"], .connection-line[data-end="${weapon.id}"]`);
      connections.forEach(line => line.classList.add('highlight-line'));
    });
    div.addEventListener('mouseleave', () => {
      const connections = this.elements.treeConnections.querySelectorAll('.connection-line.highlight-line');
      connections.forEach(line => line.classList.remove('highlight-line'));
    });

    div.addEventListener('click', () => this.openWeaponDetails(weapon, category, categoryId));
    return div;
  }

  getElementColor(type) {
    const colors = {
      'feu': '#ff4444', 'eau': '#4444ff', 'foudre': '#ffff44', 'glace': '#44ffff', 'dragon': '#aa44ff',
      'poison': '#aa44aa', 'para': '#dddd44', 'sommeil': '#44dddd', 'poisse': '#ff8844'
    };
    return colors[type.toLowerCase()] || '#888';
  }

  getIconFolder(categoryName) {
    const normalize = (str) => str.normalize('NFC').toLowerCase().trim();
    const type = WEAPON_TYPES.find(t => normalize(t.name) === normalize(categoryName));
    return type ? type.icon : "Sword_&_Shield";
  }

  openWeaponDetails(weapon, categoryName, categoryId, isAwakened = false, isSharpnessPlus1 = false) {
    const efr = calculateEFR(weapon, categoryId, isSharpnessPlus1);
    const efe = calculateEFE(weapon, isAwakened, isSharpnessPlus1);

    const hasHiddenElement = (weapon.stats.element && weapon.stats.element.hidden) || 
                             (weapon.stats.charges && weapon.stats.charges.some(c => c.requires_loadup));
    const hasSharpnessPlus1 = weapon.stats.sharpness && weapon.stats.sharpness.plus_1;

    let specificDetailsHtml = '';
    
    // Bow
    if (weapon.stats.arc_shot) {
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Tir de Guerre</span><span class="stat-value" style="color: var(--c-accent);">${weapon.stats.arc_shot}</span></div>`;
    }
    if (weapon.stats.charges && weapon.stats.charges.length > 0) {
      const formatChargesTable = (charges) => {
        let rows = '';
        charges.forEach((c, i) => {
          const isLocked = c.requires_loadup;
          rows += `<tr>
            <td class="label-cell">Niveau ${i + 1}</td>
            <td class="value-cell ${isLocked ? 'locked' : ''}">${c.type}${isLocked ? ' (Verrouillé)' : ''}</td>
          </tr>`;
        });
        return `<table class="data-table"><thead><tr><th>Niveau</th><th>Type & Puissance</th></tr></thead><tbody>${rows}</tbody></table>`;
      };
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Charges</span>${formatChargesTable(weapon.stats.charges)}</div>`;
    }
    if (weapon.stats.coatings) {
      const coatings = weapon.stats.coatings.split(',').map(c => c.trim());
      const allCoatings = ['Force', 'C.Portée', 'Poison', 'Paralysie', 'Sommeil', 'Fatigue', 'Explosion', 'Peinture'];
      
      let rows = '';
      allCoatings.forEach(c => {
        const hasIt = coatings.includes(c);
        rows += `<tr>
          <td class="label-cell">${c}</td>
          <td class="value-cell">${hasIt ? 'OUI' : '–'}</td>
        </tr>`;
      });
      
      const coatingsHtml = `<table class="data-table"><thead><tr><th>Enduit</th><th>Disponibilité</th></tr></thead><tbody>${rows}</tbody></table>`;
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Enduits</span>${coatingsHtml}</div>`;
    }
    
    // Bowguns
    if (weapon.stats.reload) {
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Recharge</span><span class="stat-value">${weapon.stats.reload}</span></div>`;
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Recul</span><span class="stat-value">${weapon.stats.recoil}</span></div>`;
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Déviation</span><span class="stat-value">${weapon.stats.deviation}</span></div>`;
    }
    
    if (weapon.stats.bowgun_shot) {
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Tirs Spéciaux</span><span class="stat-value" style="font-size: 0.9rem; color: var(--c-accent);">${weapon.stats.bowgun_shot}</span></div>`;
    }
    
    if (weapon.stats.ammo_string) {
      const formatAmmoTable = (ammoStr) => {
        const parts = ammoStr.split(' | ');
        const ammoData = {};
        let i = 0;
        while (i < parts.length) {
          const name = parts[i++];
          const vals = [];
          while (i < parts.length && !isNaN(parseInt(parts[i]))) {
            vals.push(parseInt(parts[i++]));
          }
          ammoData[name] = vals;
        }

        const groups = {
          'Physiques': ['Normal', 'Perçante', 'Plomb', 'Explosive', 'Frag', 'Tranchant', 'Feu de Wyvern'],
          'Élémentaires': ['Feu', 'Eau', 'Foudre', 'Glace', 'Dragon'],
          'Statuts': ['Poison', 'Para', 'Sommeil', 'Fatigue', 'Poisse', 'Récup', 'Démon', 'Armure', 'Peinture']
        };

        let html = '<div class="ammo-grid-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem;">';
        for (const [groupName, ammoNames] of Object.entries(groups)) {
          html += `<div class="ammo-group" style="background: rgba(0,0,0,0.2); border: 1px solid var(--c-border); padding: 0.5rem; border-radius: 8px;">
            <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--c-accent); text-align: center; margin-bottom: 0.5rem; border-bottom: 1px solid var(--c-border);">${groupName}</div>
            <table class="data-table">
              <thead><tr><th>Type</th><th>Nv1</th><th>Nv2</th><th>Nv3</th></tr></thead>
              <tbody>`;
          for (const name of ammoNames) {
            const vals = ammoData[name] || [];
            html += `<tr>
              <td class="label-cell">${name}</td>
              <td class="value-cell">${vals[0] > 0 ? vals[0] : '–'}</td>
              <td class="value-cell">${vals[1] > 0 ? vals[1] : '–'}</td>
              <td class="value-cell">${vals[2] > 0 ? vals[2] : '–'}</td>
            </tr>`;
          }
          html += `</tbody></table></div>`;
        }
        html += '</div>';
        return html;
      };
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Munitions</span>${formatAmmoTable(weapon.stats.ammo_string)}</div>`;
    }
    
    // Gunlance
    if (weapon.stats.shelling) {
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Type de Tir</span><span class="stat-value" style="color: var(--c-accent);">${weapon.stats.shelling}</span></div>`;
    }

    // Switch Axe
    if (weapon.stats.phial) {
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Type de Fiole</span><span class="stat-value" style="color: var(--c-accent);">${weapon.stats.phial}</span></div>`;
    }

    // Hunting Horn
    if (weapon.stats.notes) {
      const noteColors = {
        'white': '#ffffff', 'purple': '#d8b4e2', 'red': '#ff4444', 'blue': '#4444ff', 'green': '#44ff44', 'yellow': '#ffff44', 'cyan': '#44ffff'
      };
      const notesHtml = weapon.stats.notes.map(n => `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${noteColors[n] || n}; border:1px solid #333; margin-right:4px;"></span>`).join('');
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Notes</span><span class="stat-value" style="display:flex; align-items:center;">${notesHtml}</span></div>`;
    }

    let materialsHtml = '';
    if (weapon.materials) {
      if (weapon.materials.forge && weapon.materials.forge.length > 0) {
        materialsHtml += `<div class="materials-group">
          <div class="stat-label" style="color: var(--c-text-light); margin-bottom: 0.5rem;">Forge</div>
          <ul class="materials-list">
            ${weapon.materials.forge.map(m => `<li><span class="mat-qty">${m.quantity}x</span> <span class="mat-name">${m.item}</span></li>`).join('')}
          </ul>
        </div>`;
      }
      if (weapon.materials.upgrade && weapon.materials.upgrade.length > 0) {
        materialsHtml += `<div class="materials-group">
          <div class="stat-label" style="color: var(--c-text-light); margin-bottom: 0.5rem;">Amélioration</div>
          <ul class="materials-list">
            ${weapon.materials.upgrade.map(m => `<li><span class="mat-qty">${m.quantity}x</span> <span class="mat-name">${m.item}</span></li>`).join('')}
          </ul>
        </div>`;
      }
    }

    this.elements.modalContent.innerHTML = `
      <div class="modal-header" style="margin-bottom: 1.5rem;">
        <div class="modal-header-content">
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <img src="${getWeaponIconPath(this.getIconFolder(categoryName), weapon.rarity)}" style="width: 64px; height: 64px;" alt="" referrerPolicy="no-referrer">
            <div>
              <h2 class="cinzel accent" style="font-size: 2rem; margin: 0;">${weapon.name}</h2>
              <p class="node-rarity" style="margin: 0;">Rareté ${weapon.rarity} | ${categoryName}</p>
            </div>
          </div>
          <div style="display: flex; gap: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: ${hasHiddenElement ? 'pointer' : 'not-allowed'}; opacity: ${hasHiddenElement ? '1' : '0.5'};">
              <input type="checkbox" id="toggle-awakening" ${isAwakened ? 'checked' : ''} ${!hasHiddenElement ? 'disabled' : ''}>
              Éveil
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: ${hasSharpnessPlus1 ? 'pointer' : 'not-allowed'}; opacity: ${hasSharpnessPlus1 ? '1' : '0.5'};">
              <input type="checkbox" id="toggle-sharpness" ${isSharpnessPlus1 ? 'checked' : ''} ${!hasSharpnessPlus1 ? 'disabled' : ''}>
              Tranchant +1
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-grid">
        <section>
          <h3 class="cinzel" style="font-size: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--c-border); padding-bottom: 0.5rem; color: var(--c-text-muted);">Propriétés</h3>
          <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Attaque</span><span class="stat-value">${weapon.stats.attack}</span></div>
            <div class="stat-item"><span class="stat-label">Affinité</span><span class="stat-value">${weapon.stats.affinity !== undefined ? weapon.stats.affinity + (typeof weapon.stats.affinity === 'number' ? '%' : '') : '0%'}</span></div>
            <div class="stat-item"><span class="stat-label">Fentes</span><span class="stat-value">${'◯'.repeat(weapon.stats.slots || 0)}${'-'.repeat(3 - (weapon.stats.slots || 0))}</span></div>
            ${weapon.stats.defense !== 0 ? `<div class="stat-item"><span class="stat-label">Défense</span><span class="stat-value">${weapon.stats.defense > 0 ? '+' : ''}${weapon.stats.defense}</span></div>` : ''}
            ${weapon.stats.element ? `
              <div class="stat-item">
                <span class="stat-label">Élément</span>
                <span class="stat-value" style="color: var(--c-${
                  {
                    'feu': 'fire', 'eau': 'water', 'foudre': 'thunder', 'glace': 'ice', 'dragon': 'dragon',
                    'poison': 'poison', 'para': 'para', 'sommeil': 'sleep', 'poisse': 'slime'
                  }[weapon.stats.element.type.toLowerCase()] || 'text'
                }); opacity: ${weapon.stats.element.hidden && !isAwakened ? '0.5' : '1'};">
                  ${weapon.stats.element.type} ${weapon.stats.element.value}${weapon.stats.element.hidden && !isAwakened ? ' (Verrouillé)' : ''}
                </span>
              </div>
            ` : ''}
            ${specificDetailsHtml}
          </div>
        </section>
        
        <section>
          <h3 class="cinzel" style="font-size: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--c-border); padding-bottom: 0.5rem; color: var(--c-text-muted);">Analyse de Combat</h3>
          <div class="analysis-container" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
              <div class="analysis-box" style="background: linear-gradient(to bottom right, var(--c-surface-light), #1a1a1e); padding: 1rem; border-radius: 16px; border: 1px solid var(--c-border); text-align: center;">
                <div style="font-size: 0.6rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Effective Raw (EFR)</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--c-accent); line-height: 1;">${efr}</div>
              </div>
              <div class="analysis-box" style="background: linear-gradient(to bottom right, var(--c-surface-light), #1a1a1e); padding: 1rem; border-radius: 16px; border: 1px solid var(--c-border); text-align: center;">
                <div style="font-size: 0.6rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Effective Elem (EFE)</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--c-text); line-height: 1;">${efe || '-'}</div>
              </div>
              <div class="analysis-box" style="background: linear-gradient(to bottom right, var(--c-surface-light), #1a1a1e); padding: 1rem; border-radius: 16px; border: 1px solid var(--c-border); text-align: center; box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);">
                <div style="font-size: 0.6rem; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Score Total</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #ffd700; line-height: 1;">${efr + (efe || 0)}</div>
              </div>
            </div>
            
            ${weapon.stats.sharpness ? `
              <div class="sharpness-section">
                <div class="stat-label" style="margin-bottom: 0.5rem;">Tranchant ${isSharpnessPlus1 ? '(+1 Actif)' : '(Base)'}</div>
                <div class="sharpness-bar" style="height: 12px; background: #222; border-radius: 4px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem;">
                  ${(isSharpnessPlus1 ? weapon.stats.sharpness.plus_1 : weapon.stats.sharpness.base).map((val, i) => `
                    <div class="sharp-seg" style="width: ${val}%; background: ${['#ff4444', '#ff9944', '#ffff44', '#44ff44', '#4444ff', '#ffffff', '#ff44ff'][i]};"></div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${materialsHtml ? `
              <div class="materials-section" style="margin-top: 1.5rem;">
                <h3 class="cinzel" style="font-size: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--c-border); padding-bottom: 0.5rem; color: var(--c-text-muted);">Composants</h3>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                  ${materialsHtml}
                </div>
              </div>
            ` : ''}
          </div>
        </section>
      </div>
    `;

    // Add event listeners for toggles
    const toggleAwakening = document.getElementById('toggle-awakening');
    if (toggleAwakening) {
      toggleAwakening.addEventListener('change', (e) => {
        this.openWeaponDetails(weapon, categoryName, categoryId, e.target.checked, isSharpnessPlus1);
      });
    }

    const toggleSharpness = document.getElementById('toggle-sharpness');
    if (toggleSharpness) {
      toggleSharpness.addEventListener('change', (e) => {
        this.openWeaponDetails(weapon, categoryName, categoryId, isAwakened, e.target.checked);
      });
    }

    if (!this.elements.weaponModal.open) {
      this.elements.weaponModal.showModal();
    }
  }

  drawConnections() {
    requestAnimationFrame(() => {
      const svg = this.elements.treeConnections;
      const canvas = this.elements.treeCanvas;
      
      // Force SVG to match the full scrollable area of the canvas
      const width = Math.max(canvas.scrollWidth, canvas.offsetWidth);
      const height = Math.max(canvas.scrollHeight, canvas.offsetHeight);
      
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      
      svg.innerHTML = ''; // Clear existing connections
      const nodes = this.elements.treeNodes.querySelectorAll('.weapon-card');
      
      nodes.forEach(node => {
        const id = node.dataset.id;
        const weapon = this.currentWeaponMap?.get(id);
        if (!weapon || !weapon.children_ids || !Array.isArray(weapon.children_ids) || weapon.children_ids.length === 0) return;

        weapon.children_ids.forEach(childId => {
          const childNode = this.elements.treeNodes.querySelector(`[data-id="${childId}"]`);
          if (!childNode) return;

          const childWeapon = this.currentWeaponMap?.get(childId);
          if (childWeapon && childWeapon.parent_id !== id) return;

          this.createBezierLine(node, childNode);
        });
      });
    });
  }

  createBezierLine(startNode, endNode) {
    const svg = this.elements.treeConnections;
    const treeNodes = this.elements.treeNodes;

    const startId = startNode.dataset.id;
    const endId = endNode.dataset.id;

    // Use offsetLeft/Top relative to the canvas
    // treeNodes.offsetLeft/Top accounts for the padding of the canvas
    const x1 = startNode.offsetLeft + treeNodes.offsetLeft + startNode.offsetWidth;
    const y1 = startNode.offsetTop + treeNodes.offsetTop + startNode.offsetHeight / 2;
    
    const x2 = endNode.offsetLeft + treeNodes.offsetLeft;
    const y2 = endNode.offsetTop + treeNodes.offsetTop + endNode.offsetHeight / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connection-line");
    path.setAttribute("data-start", startId);
    path.setAttribute("data-end", endId);
    
    // Bezier curve
    const cp1x = x1 + (x2 - x1) / 2;
    const cp1y = y1;
    const cp2x = x1 + (x2 - x1) / 2;
    const cp2y = y2;
    
    path.setAttribute("d", `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);
    
    // Add interaction
    path.addEventListener('mouseenter', () => path.classList.add('highlight'));
    path.addEventListener('mouseleave', () => path.classList.remove('highlight'));
    
    svg.appendChild(path);
  }


}

// Start the app
new App();
