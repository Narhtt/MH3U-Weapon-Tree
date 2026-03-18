/**
 * MH3U WEAPON TREE - MAIN ORCHESTRATOR
 * Vanilla JS | Premium UI | Modern Standards
 */

import './style.css';
import { ICONS, WEAPON_TYPES, getWeaponIconPath } from './modules/icons.js';
import { calculateEFR, calculateEFE } from './modules/utils.js';
import panzoom from 'panzoom';
import Fuse from 'fuse.js';

const rarityColors = {
  1: '#e8e8ed', 2: '#aa44ff', 3: '#ffff44', 4: '#ff44aa', 5: '#44ff44',
  6: '#4444ff', 7: '#ff4444', 8: '#44ffff', 9: '#ff8844', 10: '#ffffaa'
};

class App {
  constructor() {
    this.weaponsData = {};
    this.currentCategory = null;
    this.collectedWeapons = JSON.parse(localStorage.getItem("mh3u_collected")) || [];
    this.wishlist = JSON.parse(localStorage.getItem("mh3u_wishlist")) || [];
    this.panzoomInstance = null;
    
    this.elements = {
      treeViewport: document.getElementById('tree-viewport'),
      treeCanvas: document.getElementById('tree-canvas'),
      treeNodes: document.getElementById('tree-nodes'),
      treeConnections: document.getElementById('tree-connections'),
      homeOverlay: document.getElementById('home-overlay'),
      weaponTypeGrid: document.getElementById('weapon-type-grid'),
      wishlistSection: document.getElementById('wishlist-section'),
      wishlistGrid: document.getElementById('wishlist-grid'),
      weaponModal: document.getElementById('weapon-modal'),
      modalContent: document.getElementById('modal-content'),
      closeModal: document.getElementById('close-modal'),
      homeBtn: document.getElementById('home-btn'),
      searchInput: document.getElementById('search-input'),
      searchResults: document.getElementById('search-results')
    };

    // Update Icons
    const homeIcon = this.elements.homeBtn.querySelector('.btn-icon');
    if (homeIcon) homeIcon.innerHTML = ICONS.home;

    this.init();
    try {
      this.setupResizeObserver();
      this.initPanzoom();
    } catch (e) {
      console.error("Critical initialization error:", e);
    }
  }

  initPanzoom() {
    try {
      this.panzoomInstance = panzoom(this.elements.treeCanvas, {
        maxZoom: 2,
        minZoom: 0.2,
        zoomDoubleClickSpeed: 1,
        beforeWheel: (e) => {
          return this.elements.weaponModal.open;
        },
        beforeMouseDown: (e) => {
          // Allow clicks on buttons and inputs to bypass panzoom
          if (e.target.closest('button, input, .wishlist-toggle, .collection-checkbox')) {
            return true; // This ignores the event in panzoom
          }
          return false;
        },
        // Prevent panzoom from capturing clicks on interactive elements
        onTouch: (e) => {
          if (e.target.closest('button, input, .wishlist-toggle, .collection-checkbox')) {
            return false; // Don't prevent default
          }
        }
      });

      this.panzoomInstance.on('transform', (e) => {
        const transform = e.getTransform();
        let { x, y, scale } = transform;
        let changed = false;

        // Verrouillage Supérieur : Interdire strictement tout déplacement au-dessus de Y = 0
        if (y > 0) {
          y = 0;
          changed = true;
        }

        // Calcul des Limites
        const viewportRect = this.elements.treeViewport.getBoundingClientRect();
        const contentWidth = this.elements.treeCanvas.offsetWidth;
        const contentHeight = this.elements.treeCanvas.offsetHeight;
        const minX = viewportRect.width - (contentWidth * scale);
        const minY = viewportRect.height - (contentHeight * scale);

        // Limite gauche
        if (minX < 0 && x > 0) {
          x = 0;
          changed = true;
        } else if (minX >= 0 && x > minX) {
          x = minX;
          changed = true;
        }

        // Limite droite
        if (minX < 0 && x < minX) {
          x = minX;
          changed = true;
        } else if (minX >= 0 && x < 0) {
          x = 0;
          changed = true;
        }

        // Limite basse
        if (minY < 0 && y < minY) {
          y = minY;
          changed = true;
        } else if (minY >= 0 && y < 0) {
          y = 0;
          changed = true;
        }

        if (changed) {
          // Use moveTo to apply clamped coordinates safely
          // We use a small timeout or requestAnimationFrame to avoid recursion issues
          // but panzoom's moveTo is usually safe to call from transform if values changed
          this.panzoomInstance.moveTo(x, y);
        }
      });
      console.log("Panzoom initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Panzoom:", error);
    }
  }

  setupDelegatedEvents() {
    this.elements.treeNodes.addEventListener('click', (e) => {
      const card = e.target.closest('.weapon-card');
      if (!card) return;
      
      const weaponId = card.dataset.id;
      // Check if it's a collection checkbox
      if (e.target.classList.contains('collection-checkbox')) {
        this.toggleCollection(weaponId);
        return;
      }
      // Check if it's a wishlist toggle
      if (e.target.closest('.wishlist-toggle')) {
        this.toggleWishlist(weaponId, e);
        return;
      }
      
      // Otherwise, it's a card click
      const weapon = this.findWeaponById(weaponId);
      if (weapon) {
        this.openWeaponDetails(weapon, card.dataset.cat, card.dataset.catid);
      }
    });

    this.elements.treeNodes.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.weapon-card');
      if (!card) return;
      const weaponId = card.dataset.id;
      const connections = this.elements.treeConnections.querySelectorAll(`.connection-line[data-start="${weaponId}"], .connection-line[data-end="${weaponId}"]`);
      connections.forEach(line => line.classList.add('highlight-line'));
    });

    this.elements.treeNodes.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.weapon-card');
      if (!card) return;
      const connections = this.elements.treeConnections.querySelectorAll('.connection-line.highlight-line');
      connections.forEach(line => line.classList.remove('highlight-line'));
    });
  }

  findWeaponById(id) {
    for (const weapons of Object.values(this.weaponsData)) {
      const weapon = weapons.find(w => w.id === id);
      if (weapon) return weapon;
    }
    return null;
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

  toggleWishlist(weaponId, e) {
    if (e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    const index = this.wishlist.indexOf(weaponId);
    if (index > -1) {
      this.wishlist.splice(index, 1);
    } else {
      this.wishlist.push(weaponId);
    }
    localStorage.setItem("mh3u_wishlist", JSON.stringify(this.wishlist));
    
    // Update UI
    const toggles = document.querySelectorAll(`.wishlist-toggle[data-id="${weaponId}"]`);
    toggles.forEach(t => {
      const active = this.wishlist.includes(weaponId);
      t.classList.toggle('active', active);
      t.title = active ? "Retirer de la wishlist" : "Ajouter à la wishlist";
    });
    
    this.renderWishlist();
  }

   async init() {
    const hostname = window.location.hostname;
    // Détection des environnements de développement (Local ou Google AI Studio)
    const isDev = hostname.includes('localhost') || 
                  hostname.includes('127.0.0.1') || 
                  hostname.includes('run.app') || 
                  hostname.includes('googleusercontent');

    if ('serviceWorker' in navigator) {
      if (isDev) {
        // En mode DEV, on désactive le SW et on nettoie activement les anciens caches
        console.log('Mode Dev détecté : Nettoyage du Service Worker...');
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        // Supprime aussi les caches physiques pour être 100% sûr
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Environnement propre : Cache et SW supprimés.');
      } else {
        // En mode PROD, on enregistre normalement pour les performances offline
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker actif (Prod)'))
            .catch(err => console.error('Échec SW:', err));
        });
      }
    } 

    try {
      const response = await fetch("/data/mh3u_data_ultra_min.json");
      const fullData = await response.json();
      this.meta = fullData.meta;
      this.weaponsData = fullData.data;
      this.renderHomeMenu();
      this.renderWishlist();
      this.setupSearch();
      this.bindEvents();
      this.setupDelegatedEvents();

      // Handle Deep Linking
      const urlParams = new URLSearchParams(window.location.search);
      const catId = urlParams.get('cat');
      const weaponId = urlParams.get('wp');
      
      if (catId) {
        const type = WEAPON_TYPES.find(t => t.id === catId.toUpperCase());
        if (type) {
          this.loadCategory(type.name, type.id, false); // false = don't push state again
          
          if (weaponId) {
            // Find weapon in current category
            const weapon = this.weaponsData[type.name].find(w => w.id === weaponId);
            if (weapon) {
              setTimeout(() => {
                this.openWeaponDetails(weapon, type.name, type.id);
                this.teleportToWeapon(weaponId);
              }, 300);
            }
          }
        }
      }

      window.addEventListener('popstate', (e) => {
        const params = new URLSearchParams(window.location.search);
        const cId = params.get('cat');
        const wId = params.get('wp');
        
        if (cId) {
          const type = WEAPON_TYPES.find(t => t.id === cId.toUpperCase());
          if (type) {
            this.loadCategory(type.name, type.id, false);
            if (wId) {
              const weapon = this.weaponsData[type.name].find(w => w.id === wId);
              if (weapon) this.openWeaponDetails(weapon, type.name, type.id);
            } else {
              this.elements.weaponModal.close();
            }
          }
        } else {
          this.showHome(false);
        }
      });

      console.log("MH3U Database Loaded Successfully (Optimized Format)");
    } catch (error) {
      console.error("Failed to load weapon database:", error);
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.innerHTML = '<div class="error-message">Échec de connexion à la Forge de Moga</div>';
      }
    }
  }

  getMeta(type, id) {
    if (id === null || id === undefined) return null;
    if (this.meta && this.meta[type] && this.meta[type][id] !== undefined) {
      return this.meta[type][id];
    }
    return id;
  }

  bindEvents() {
    this.elements.homeBtn.addEventListener('click', () => {
      console.log("Home Clicked");
      this.showHome();
    });
    this.elements.closeModal.addEventListener('click', () => {
      this.elements.weaponModal.close();
      this.updateUrl(this.currentCategoryId, null);
    });
    
    // Close modal on backdrop click
    this.elements.weaponModal.addEventListener('click', (e) => {
      if (e.target === this.elements.weaponModal) {
        this.elements.weaponModal.close();
        this.updateUrl(this.currentCategoryId, null);
      }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.elements.searchInput.focus();
      }
      if (e.key === 'Escape') {
        this.elements.searchInput.blur();
        this.elements.searchResults.classList.add('hidden');
      }
    });

    this.elements.searchInput.addEventListener('focus', () => {
      if (this.elements.searchInput.value) {
        this.elements.searchResults.classList.remove('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) {
        this.elements.searchResults.classList.add('hidden');
      }
    });

    this.elements.searchInput.addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });

    // Redraw connections on window resize
    window.addEventListener('resize', () => {
      if (this.currentCategory) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.drawConnections(), 150);
      }
    });
  }

  setupSearch() {
    const allWeapons = [];
    for (const [category, weapons] of Object.entries(this.weaponsData)) {
      const type = WEAPON_TYPES.find(t => t.name === category);
      weapons.forEach(w => {
        allWeapons.push({
          ...w,
          category,
          categoryId: type ? type.id : ''
        });
      });
    }

    this.fuse = new Fuse(allWeapons, {
      keys: ['n'],
      threshold: 0.3,
      limit: 10
    });
  }

  performSearch(query) {
    if (!query) {
      this.elements.searchResults.innerHTML = '';
      this.elements.searchResults.classList.add('hidden');
      return;
    }

    const results = this.fuse.search(query);
    if (results.length === 0) {
      this.elements.searchResults.innerHTML = '<div class="no-results" style="padding: 1rem; text-align: center; color: var(--c-text-dim);">Aucun résultat</div>';
      this.elements.searchResults.classList.remove('hidden');
      return;
    }

    this.elements.searchResults.innerHTML = results.map(res => {
      const w = res.item;
      const iconPath = getWeaponIconPath(this.getIconFolder(w.category));
      return `
        <div class="search-result-item" data-id="${w.id}" data-cat="${w.category}" data-catid="${w.categoryId}">
          <div class="node-icon" style="width: 32px; height: 32px; --icon-url: url('${iconPath}'); --rarity-color: ${rarityColors[w.r] || '#fff'};"></div>
          <div class="search-result-info">
            <span class="search-result-name">${w.n}</span>
            <span class="search-result-meta">Rareté ${w.r} | ${w.category}</span>
          </div>
        </div>
      `;
    }).join('');
    this.elements.searchResults.classList.remove('hidden');

    this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const cat = item.dataset.cat;
        const catId = item.dataset.catid;
        const weapon = this.weaponsData[cat].find(w => w.id === id);
        
        this.elements.searchResults.classList.add('hidden');
        this.elements.searchInput.value = '';
        this.elements.searchInput.blur();
        this.loadCategory(cat, catId);
        
        setTimeout(() => {
          this.teleportToWeapon(id);
          if (weapon) this.openWeaponDetails(weapon, cat, catId);
        }, 300);
      });
    });
  }

  teleportToWeapon(weaponId) {
    const node = document.querySelector(`.weapon-card[data-id="${weaponId}"]`);
    if (!node) return;

    // Remove existing highlights
    document.querySelectorAll('.glow-highlight').forEach(el => el.classList.remove('glow-highlight'));
    
    // Add highlight
    node.classList.add('glow-highlight');
    setTimeout(() => node.classList.remove('glow-highlight'), 5000);

    // Panzoom to node
    const rect = node.getBoundingClientRect();
    const viewportRect = this.elements.treeViewport.getBoundingClientRect();
    
    // Calculate current center of the node in viewport coordinates
    const currentCenterX = rect.left + rect.width / 2;
    const currentCenterY = rect.top + rect.height / 2;
    
    // Calculate target center in viewport coordinates
    const targetCenterX = viewportRect.left + viewportRect.width / 2;
    const targetCenterY = viewportRect.top + viewportRect.height / 2;
    
    // Calculate difference
    const dx = targetCenterX - currentCenterX;
    const dy = targetCenterY - currentCenterY;
    
    // Get current transform and apply difference
    const transform = this.panzoomInstance.getTransform();
    const targetX = transform.x + dx;
    const targetY = transform.y + dy;
    
    this.panzoomInstance.smoothMoveTo(targetX, targetY);
  }

  renderWishlist() {
    if (this.wishlist.length === 0) {
      this.elements.wishlistSection.classList.add('hidden');
      return;
    }

    this.elements.wishlistSection.classList.remove('hidden');
    
    const wishlistWeapons = [];
    for (const [category, weapons] of Object.entries(this.weaponsData)) {
      const type = WEAPON_TYPES.find(t => t.name === category);
      weapons.forEach(w => {
        if (this.wishlist.includes(w.id)) {
          wishlistWeapons.push({ ...w, category, categoryId: type ? type.id : '' });
        }
      });
    }

    this.elements.wishlistGrid.innerHTML = wishlistWeapons.map(w => {
      const iconPath = getWeaponIconPath(this.getIconFolder(w.category));
      return `
        <div class="wishlist-card" data-id="${w.id}" data-cat="${w.category}" data-catid="${w.categoryId}">
          <div class="node-icon" style="--icon-url: url('${iconPath}'); --rarity-color: ${rarityColors[w.r] || '#fff'};"></div>
          <div class="search-result-info">
            <span class="search-result-name">${w.n}</span>
            <span class="search-result-meta">Rareté ${w.r} | ${w.category}</span>
          </div>
          <button class="wishlist-toggle active" data-id="${w.id}" title="Retirer de la wishlist">${ICONS.star}</button>
        </div>
      `;
    }).join('');

    this.elements.wishlistGrid.querySelectorAll('.wishlist-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('wishlist-toggle')) {
          this.toggleWishlist(card.dataset.id);
          return;
        }
        
        const id = card.dataset.id;
        const cat = card.dataset.cat;
        const catId = card.dataset.catid;
        const weapon = wishlistWeapons.find(w => w.id === id);
        
        this.loadCategory(cat, catId);
        setTimeout(() => {
          this.teleportToWeapon(id);
          if (weapon) this.openWeaponDetails(weapon, cat, catId);
        }, 300);
      });
    });
  }

  renderHomeMenu() {
    this.elements.weaponTypeGrid.innerHTML = WEAPON_TYPES.map(type => `
      <div class="weapon-type-card" data-category="${type.name}" data-id="${type.id}">
        <div class="node-icon" style="--icon-url: url('${getWeaponIconPath(type.icon)}'); --rarity-color: ${rarityColors[1]};"></div>
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

  showHome(pushState = true) {
    this.elements.homeOverlay.classList.remove('hidden');
    this.currentCategory = null;
    this.currentCategoryId = null;
    if (pushState) this.updateUrl(null, null);
  }

  loadCategory(category, categoryId, pushState = true) {
    this.currentCategory = category;
    this.currentCategoryId = categoryId;
    this.elements.homeOverlay.classList.add('hidden');
    
    if (pushState) this.updateUrl(categoryId, null);
    
    this.renderTree(category, categoryId);
    
    // Reset Panzoom position when loading new category
    setTimeout(() => {
      this.panzoomInstance.moveTo(0, 0);
      this.panzoomInstance.zoomAbs(0, 0, 1);
    }, 50);
  }

  updateUrl(catId, weaponId) {
    const url = new URL(window.location);
    if (catId) {
      url.searchParams.set('cat', catId.toLowerCase());
    } else {
      url.searchParams.delete('cat');
    }
    
    if (weaponId) {
      url.searchParams.set('wp', weaponId);
    } else {
      url.searchParams.delete('wp');
    }
    
    window.history.pushState({}, '', url);
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
      !w.pid || 
      w.pid === "" || 
      w.pid === "None" || 
      !this.currentWeaponMap.has(w.pid)
    );

    // 2. Calculate Relative Depth and Subtree Height
    const calculateMetrics = (weapon, relDepth = 1) => {
      const parent = this.currentWeaponMap.get(weapon.pid);
      if (!parent || parent.r !== weapon.r) {
        weapon.relDepth = 1;
      } else {
        weapon.relDepth = relDepth;
      }

      const children = (weapon.kids || [])
        .map(id => this.currentWeaponMap.get(id))
        .filter(Boolean);
      
      if (children.length === 0) {
        weapon.subtreeHeight = 1;
        return 1;
      }

      let height = 0;
      children.forEach(child => {
        const nextRelDepth = (child.r === weapon.r) ? weapon.relDepth + 1 : 1;
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
      const r = w.r || 1;
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
      header.style.color = `var(--r${rarity})`;
      header.style.borderBottomColor = `var(--r${rarity})`;
      header.textContent = `Rareté ${rarity}`;
      header.style.gridColumn = `${offset} / span ${span}`;
      header.style.gridRow = 1;
      this.elements.treeNodes.appendChild(header);
    });

    // 6. Assign Rows
    let currentRow = 2; // Start after headers
    const assignRows = (weapon, rowOffset) => {
      weapon.row = rowOffset;
      weapon.col = rarityOffsets[weapon.r || 1] + (weapon.relDepth || 1) - 1;

      const children = (weapon.kids || [])
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
    div.dataset.rarity = weapon.r;
    div.dataset.cat = category;
    div.dataset.catid = categoryId;
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Arme: ${weapon.n}`);
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openWeaponDetails(weapon, category, categoryId);
      }
    });
    
    const iconPath = getWeaponIconPath(this.getIconFolder(category));
    const efr = calculateEFR(weapon, categoryId.toUpperCase());
    const efe = calculateEFE(weapon);
    
    const element = weapon.st?.el;
    const elementType = element ? this.getMeta('elements', element.t) : null;
    const elementHtml = elementType ? `
      <span class="node-element-tag ${elementType.toLowerCase()}" style="background: ${this.getElementColor(elementType)}; color: #fff;">
        ${elementType.charAt(0).toUpperCase()}
      </span>
    ` : '';

    const affinity = weapon.st?.aff || 0;
    const affinityHtml = affinity !== 0 ? `
      <span style="color: ${affinity > 0 ? '#44ff44' : '#ff4444'}; font-size: 0.7rem;">
        Aff. ${affinity > 0 ? '+' : ''}${affinity}%
      </span>
    ` : '';

    const defense = weapon.st?.def || 0;
    const defenseHtml = defense !== 0 ? `
      <span style="color: #4488ff; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 2px;">
        <span style="width: 12px; height: 12px; display: inline-block;">${ICONS.shield_small}</span> ${defense > 0 ? '+' : ''}${defense}
      </span>
    ` : '';

    const forgeIcon = weapon.forg ? `<div class="forge-icon" title="Forgeable"><span style="width: 16px; height: 16px; display: block;">${ICONS.hammer_small}</span></div>` : '';
    const isWishlisted = this.wishlist.includes(weapon.id);

    div.innerHTML = `
      <button class="wishlist-toggle ${isWishlisted ? 'active' : ''}" data-id="${weapon.id}" title="Ajouter à la wishlist">${ICONS.star}</button>
      <div class="node-header">
        <div class="node-icon" style="--icon-url: url('${iconPath}'); --rarity-color: ${rarityColors[weapon.r] || '#fff'};"></div>
        <div class="node-title">
          <span class="node-name">${weapon.n}</span>
          <div class="node-meta">
            <span class="node-atk">ATK ${weapon.st?.atk || 0}</span>
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

    return div;
  }

  getElementColor(type) {
  const colors = {
    'feu': '#ff4444', 'eau': '#4444ff', 'foudre': '#ffff44', 'glace': '#44ffff', 'dragon': '#aa44ff',
    'poison': '#aa44aa', 'para': '#dddd44', 'sommeil': '#44dddd', 
    'poisse': '#ff8844', 'explosion': '#ff8844'
  };
  return colors[type.toLowerCase()] || '#888';
}

  getIconFolder(categoryName) {
    const normalize = (str) => str.normalize('NFC').toLowerCase().trim();
    const type = WEAPON_TYPES.find(t => normalize(t.name) === normalize(categoryName));
    if (type) return type.icon;
    
    // Fallback for Great Sword if normalization fails
    if (categoryName.toLowerCase().includes('grande') && categoryName.toLowerCase().includes('épée')) return "Great_Sword";
    
    return "Sword_&_Shield";
  }

  openWeaponDetails(weapon, categoryName, categoryId, isAwakened = false, isSharpnessPlus1 = false) {
    this.updateUrl(categoryId, weapon.id);
    const efr = calculateEFR(weapon, categoryId.toUpperCase(), isSharpnessPlus1);
    const efe = calculateEFE(weapon, isAwakened, isSharpnessPlus1);

    const hasHiddenElement = (weapon.st?.el && weapon.st.el.h) || 
                             (weapon.st?.ch && weapon.st.ch.some(c => c.r));
    const hasSharpnessPlus1 = weapon.st?.sh && weapon.st.sh.plus_1;

    let specificDetailsHtml = '';
    
    // Bow
    if (weapon.st?.arc !== null && weapon.st?.arc !== undefined) {
      const arcShot = this.getMeta('arc_shots', weapon.st.arc);
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Tir de Guerre</span><span class="stat-value" style="color: var(--c-accent);">${arcShot}</span></div>`;
    }
    if (weapon.st?.ch && weapon.st.ch.length > 0) {
      const formatChargesTable = (charges) => {
        let rows = '';
        charges.forEach((c, i) => {
          const isLocked = c.r;
          rows += `<tr>
            <td class="label-cell">Niveau ${i + 1}</td>
            <td class="value-cell ${isLocked ? 'locked' : ''}">${c.t}${isLocked ? ' (Verrouillé)' : ''}</td>
          </tr>`;
        });
        return `<table class="data-table"><thead><tr><th>Niveau</th><th>Type & Puissance</th></tr></thead><tbody>${rows}</tbody></table>`;
      };
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Charges</span>${formatChargesTable(weapon.st.ch)}</div>`;
    }
    if (weapon.st?.co) {
      const coatings = weapon.st.co.map(idx => this.getMeta('coatings', idx));
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
    if (weapon.st?.rs) {
      const [reload, recoil, deviation] = weapon.st.rs.split('|').map(s => s.trim());
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Recharge</span><span class="stat-value">${reload}</span></div>`;
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Recul</span><span class="stat-value">${recoil}</span></div>`;
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Déviation</span><span class="stat-value">${deviation}</span></div>`;
    }
    
    if (weapon.st?.bs) {
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Tirs Spéciaux</span><span class="stat-value" style="font-size: 0.9rem; color: var(--c-accent);">${weapon.st.bs}</span></div>`;
    }
    
    if (weapon.st?.am) {
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
      specificDetailsHtml += `<div class="stat-item full-width"><span class="stat-label">Munitions</span>${formatAmmoTable(weapon.st.am)}</div>`;
    }
    
    // Gunlance
    if (weapon.st?.shl !== null && weapon.st?.shl !== undefined) {
      const shelling = this.getMeta('shelling', weapon.st.shl);
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Type de Tir</span><span class="stat-value" style="color: var(--c-accent);">${shelling}</span></div>`;
    }

    // Switch Axe
    if (weapon.st?.ph !== null && weapon.st?.ph !== undefined) {
      const phial = this.getMeta('phials', weapon.st.ph);
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Type de Fiole</span><span class="stat-value" style="color: var(--c-accent);">${phial}</span></div>`;
    }

    // Hunting Horn
    if (weapon.st?.nt) {
      const noteColors = ['#ffffff', '#d8b4e2', '#ff4444', '#4444ff', '#44ff44', '#ffff44', '#44ffff'];
      const notesHtml = weapon.st.nt.map(idx => `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${noteColors[idx] || '#888'}; border:1px solid #333; margin-right:4px;"></span>`).join('');
      specificDetailsHtml += `<div class="stat-item"><span class="stat-label">Notes</span><span class="stat-value" style="display:flex; align-items:center;">${notesHtml}</span></div>`;
    }

    let materialsHtml = '';
    if (weapon.mat) {
      if (weapon.mat.forge && weapon.mat.forge.length > 0) {
        materialsHtml += `<div class="materials-group">
          <div class="stat-label" style="color: var(--c-text-light); margin-bottom: 0.5rem;">Forge</div>
          <ul class="materials-list">
            ${weapon.mat.forge.map(m => `<li><span class="mat-qty">${m.quantity}x</span> <span class="mat-name">${m.item}</span></li>`).join('')}
          </ul>
        </div>`;
      }
      if (weapon.mat.upgrade && weapon.mat.upgrade.length > 0) {
        materialsHtml += `<div class="materials-group">
          <div class="stat-label" style="color: var(--c-text-light); margin-bottom: 0.5rem;">Amélioration</div>
          <ul class="materials-list">
            ${weapon.mat.upgrade.map(m => `<li><span class="mat-qty">${m.quantity}x</span> <span class="mat-name">${m.item}</span></li>`).join('')}
          </ul>
        </div>`;
      }
    }

    const element = weapon.st?.el;
    const elementType = element ? this.getMeta('elements', element.t) : null;

    this.elements.modalContent.innerHTML = `
      <div class="modal-header" style="margin-bottom: 1.5rem;">
        <div class="modal-header-content">
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="node-icon" style="width: 64px; height: 64px; --icon-url: url('${getWeaponIconPath(this.getIconFolder(categoryName))}'); --rarity-color: ${rarityColors[weapon.r] || '#fff'};"></div>
            <div>
              <h2 class="cinzel accent" style="font-size: 2rem; margin: 0;">${weapon.n}</h2>
              <p class="node-rarity" style="margin: 0;">Rareté ${weapon.r} | ${categoryName}</p>
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
            <div class="stat-item"><span class="stat-label">Attaque</span><span class="stat-value">${weapon.st?.atk || 0}</span></div>
            <div class="stat-item"><span class="stat-label">Affinité</span><span class="stat-value">${weapon.st?.aff !== undefined ? weapon.st.aff + '%' : '0%'}</span></div>
            <div class="stat-item"><span class="stat-label">Fentes</span><span class="stat-value">${'◯'.repeat(weapon.st?.sl || 0)}${'-'.repeat(3 - (weapon.st?.sl || 0))}</span></div>
            ${weapon.st?.def !== 0 ? `<div class="stat-item"><span class="stat-label">Défense</span><span class="stat-value">${weapon.st?.def > 0 ? '+' : ''}${weapon.st.def}</span></div>` : ''}
            ${elementType ? `
              <div class="stat-item">
                <span class="stat-label">Élément</span>
                <span class="stat-value" style="color: var(--c-${
                  {
                    'feu': 'fire', 'eau': 'water', 'foudre': 'thunder', 'glace': 'ice', 'dragon': 'dragon',
                    'poison': 'poison', 'para': 'para', 'sommeil': 'sleep', 
                    'poisse': 'slime', 'explosion': 'slime'
                  }[elementType.toLowerCase()] || 'text'
                }); opacity: ${element.h && !isAwakened ? '0.5' : '1'};">
                  ${elementType} ${element.v}${element.h && !isAwakened ? ' (Verrouillé)' : ''}
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
            
            ${weapon.st?.sh ? `
              <div class="sharpness-section">
                <div class="stat-label" style="margin-bottom: 0.5rem;">Tranchant ${isSharpnessPlus1 ? '(+1 Actif)' : '(Base)'}</div>
                <div class="sharpness-bar" style="height: 12px; background: #222; border-radius: 4px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 0.5rem;">
                  ${(isSharpnessPlus1 ? weapon.st.sh.plus_1 : weapon.st.sh.base).map((val, i) => `
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
      
      // Cache node positions
      const nodePositions = new Map();
      nodes.forEach(node => {
        nodePositions.set(node.dataset.id, {
          x: node.offsetLeft,
          y: node.offsetTop,
          w: node.offsetWidth,
          h: node.offsetHeight
        });
      });
      
      nodes.forEach(node => {
        const id = node.dataset.id;
        const weapon = this.currentWeaponMap?.get(id);
        if (!weapon || !weapon.kids || !Array.isArray(weapon.kids) || weapon.kids.length === 0) return;

        weapon.kids.forEach(childId => {
          const childNode = this.elements.treeNodes.querySelector(`[data-id="${childId}"]`);
          if (!childNode) return;

          const childWeapon = this.currentWeaponMap?.get(childId);
          if (childWeapon && childWeapon.pid !== id) return;

          // Pass cached positions to createBezierLine
          this.createBezierLine(node, childNode, nodePositions.get(id), nodePositions.get(childId));
        });
      });
    });
  }

  createBezierLine(startNode, endNode, startPos, endPos) {
    const svg = this.elements.treeConnections;
    const treeNodes = this.elements.treeNodes;

    const startId = startNode.dataset.id;
    const endId = endNode.dataset.id;

    // Use cached positions
    const x1 = startPos.x + treeNodes.offsetLeft + startPos.w;
    const y1 = startPos.y + treeNodes.offsetTop + startPos.h / 2;
    const x2 = endPos.x + treeNodes.offsetLeft;
    const y2 = endPos.y + treeNodes.offsetTop + endPos.h / 2;

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
