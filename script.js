const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiuvrw08ikKod2F6caNTy2tjrKEGySGHdIl_-dxksPRk8hmU4tX3O7suF3Y6NKU4oz/exec";

const rarityIcons = {
    "Commune": "https://info.oupi.eu/wp-content/uploads/2025/07/commune-lorcana.png.webp",
    "Peu Commune": "https://info.oupi.eu/wp-content/uploads/2025/07/unco-lorcana.png.webp",
    "Rare": "https://info.oupi.eu/wp-content/uploads/2025/07/rare-lorcana.png.webp",
    "Super Rare": "https://info.oupi.eu/wp-content/uploads/2025/07/super-rare-lorcana.png.webp",
    "Légendaire": "https://info.oupi.eu/wp-content/uploads/2025/07/legendaire-lorcana.png.webp",
    "Enchantée": "https://info.oupi.eu/wp-content/uploads/2025/07/enchantee-lorcana.png.webp",
    "Épique": "https://info.oupi.eu/wp-content/uploads/2025/07/epic-lorcana.png.webp",
    "Iconique": "https://info.oupi.eu/wp-content/uploads/2025/07/iconic-lorcana.png.webp"
};

let chaptersData = {};
let missingCardsList = [];
let collectorCardsList = [];
let selectedKey = null;

// ==========================================
// GESTION DE LA MODALE : CARTES MANQUANTES (avec prix)
// ==========================================
function openMissingModal() {
    document.getElementById('missing-modal').style.display = 'flex';
    renderMissingCardsModal();
}

function closeMissingModal() {
    closeCardZoom();
    document.getElementById('missing-modal').style.display = 'none';
}

function openCardZoom(imgUrl, cardPrice) {
    if (!imgUrl) return;
    const zoomOverlay = document.getElementById('card-zoom-overlay');
    const modalBox = document.getElementById('modal-box-container');

    zoomOverlay.innerHTML = `
        <div style="position: relative; display: inline-flex; justify-content: center; align-items: center;">
            <img src="${imgUrl}" class="card-zoom-img" alt="Zoom Carte">
            ${cardPrice ? `<div class="card-zoom-price-badge">${cardPrice}</div>` : ''}
        </div>
    `;
    zoomOverlay.style.display = 'flex';
    modalBox.classList.add('blurred');
}

function closeCardZoom() {
    const zoomOverlay = document.getElementById('card-zoom-overlay');
    const modalBox = document.getElementById('modal-box-container');

    zoomOverlay.style.display = 'none';
    modalBox.classList.remove('blurred');
}

async function renderMissingCardsModal() {
    const container = document.getElementById('missing-modal-content');
    
    if (!missingCardsList || missingCardsList.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-style: italic; font-size: 0.85rem; text-align: center; display: block; padding: 20px;">Aucune carte manquante trouvée.</span>`;
        return;
    }

    let totalMissingPrice = 0;
    missingCardsList.forEach(card => {
        if (card.price && !isNaN(card.price)) totalMissingPrice += card.price;
    });

    const grouped = {};
    missingCardsList.forEach(card => {
        if (!grouped[card.chapter]) grouped[card.chapter] = [];
        grouped[card.chapter].push(card);
    });

    container.innerHTML = '';

    const summaryBanner = document.createElement('div');
    summaryBanner.style.cssText = "background: rgba(243, 206, 120, 0.1); border: 1px solid var(--gold); border-radius: 8px; padding: 10px; text-align: center; font-family: 'Cinzel', serif; color: var(--gold-light); font-size: 0.85rem; margin-bottom: 5px;";
    summaryBanner.innerHTML = `Valeur estimée totale manquante : <strong style="color: var(--gold);">${totalMissingPrice.toFixed(2).replace('.', ',')} €</strong>`;
    container.appendChild(summaryBanner);

    for (const [chapName, cards] of Object.entries(grouped)) {
        const section = document.createElement('div');
        section.className = 'missing-chapter-section';
        
        let chapTotal = 0;
        cards.forEach(c => {
            if (c.price && !isNaN(c.price)) chapTotal += c.price;
        });
        const chapPriceText = chapTotal > 0 ? ` - <span style="color: var(--gold);">${chapTotal.toFixed(2).replace('.', ',')} €</span>` : '';

        section.innerHTML = `
            <div class="missing-chapter-title">${chapName} (${cards.length} manquante${cards.length > 1 ? 's' : ''}${chapPriceText})</div>
            <div class="missing-cards-grid" id="grid-${CSS.escape(chapName)}"></div>
        `;
        container.appendChild(section);

        const grid = section.querySelector('.missing-cards-grid');

        cards.forEach(card => {
            const cardItem = document.createElement('div');
            
            // --- AJOUT : Vérification de la rareté (>= 6) ---
            const rarityLevel = parseInt(card.rarity) || 0;
            const isFoilEffect = rarityLevel >= 6;
            
            // On ajoute dynamiquement la classe si la carte est Épique, Enchantée ou Iconique
            cardItem.className = `missing-card-item ${isFoilEffect ? 'foil-epic-card' : ''}`;
            
            const formattedPrice = (card.price && card.price > 0) ? `${card.price.toFixed(2).replace('.', ',')} €` : '';
            const priceSubText = formattedPrice ? `<div class="card-price-sub">${formattedPrice}</div>` : `<div class="card-price-sub" style="color: var(--text-muted); font-style: italic;">Prix N/C</div>`;

            cardItem.innerHTML = `
                <div class="missing-card-img-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 0.6rem; color: var(--text-muted);">...</span>
                </div>
                <div class="missing-card-name" title="${card.name}">${card.name}</div>
                ${priceSubText}
            `;
            grid.appendChild(cardItem);

            fetchCardImage(card.setCode, card.cardNumber, cardItem, formattedPrice);
        });
    }
}

async function fetchCardImage(setCode, cardNumber, itemElement, formattedPrice) {
    const imgWrapper = itemElement.querySelector('.missing-card-img-wrapper');
    try {
        const response = await fetch(`https://api.lorcast.com/v0/cards/${setCode}/${cardNumber}`, { mode: 'cors' });
        if (!response.ok) throw new Error();

        const data = await response.json();
        const imageUrl = data.image_uris?.digital?.normal || '';

        if (imageUrl) {
            imgWrapper.innerHTML = `<img src="${imageUrl}" class="missing-card-img" alt="Carte">`;
            imgWrapper.onclick = () => openCardZoom(imageUrl, formattedPrice);
        } else {
            imgWrapper.innerHTML = `<span style="font-size: 0.6rem; color: #ff6b6b; display: flex; align-items: center; justify-content: center; height: 100%;">Indisponible</span>`;
            imgWrapper.style.cursor = 'default';
        }
    } catch (err) {
        imgWrapper.innerHTML = `<span style="font-size: 0.6rem; color: #ff6b6b; display: flex; align-items: center; justify-content: center; height: 100%;">Erreur API</span>`;
        imgWrapper.style.cursor = 'default';
    }
}


// ==========================================
// GESTION DE LA MODALE : MES PLUS BELLES CARTES (sans prix)
// ==========================================
function openCollectorModal() {
    document.getElementById('collector-modal').style.display = 'flex';
    renderCollectorModal();
}

function closeCollectorModal() {
    closeCollectorZoom();
    document.getElementById('collector-modal').style.display = 'none';
}

function openCollectorZoom(cardInput) {
    if (!cardInput) return;

    // Gestion souple si on passe un objet ou juste une string URL
    const imageUrl = typeof cardInput === 'string' ? cardInput : cardInput.imageUrl;
    const layout = typeof cardInput === 'object' ? cardInput.layout : 'normal';

    if (!imageUrl) return;

    const zoomOverlay = document.getElementById('collector-zoom-overlay');
    const modalBox = document.getElementById('modal-box-container');

    if (!zoomOverlay) {
        console.error("Erreur : L'élément #collector-zoom-overlay est introuvable dans le HTML.");
        return;
    }

    const isLandscape = (layout === 'landscape');

    // On injecte la classe is-landscape si nécessaire
    zoomOverlay.innerHTML = `
        <div class="collector-zoom-card-container ${isLandscape ? 'is-landscape' : ''}" id="zoom-card-container">
            <img src="${imageUrl}" class="card-zoom-img" alt="Zoom Carte">
        </div>
    `;
    
    // Fermeture au clic sur l'overlay
    zoomOverlay.onclick = () => {
        closeCollectorZoom();
    };

    zoomOverlay.style.display = 'flex';
    
    if (modalBox) {
        modalBox.classList.add('blurred');
    }
}

function closeCollectorZoom() {
    const zoomOverlay = document.getElementById('collector-zoom-overlay');
    const modalBox = document.getElementById('modal-box-container');

    if (zoomOverlay) {
        zoomOverlay.style.display = 'none';
        zoomOverlay.innerHTML = '';
    }
    
    if (modalBox) {
        modalBox.classList.remove('blurred');
    }
}

async function renderCollectorModal() {
    const container = document.getElementById('collector-modal-content');
    
    if (!collectorCardsList || collectorCardsList.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-style: italic; font-size: 0.85rem; text-align: center; display: block; padding: 20px;">Aucune belle carte trouvée. Pense à exécuter le script dans Google Sheets !</span>`;
        return;
    }

    // 1. Correction selon ton barème réel : 6 = Épique, 7 = Enchantée, 8 = Iconique
    const rarityConfig = {
        8: "Iconique",
        7: "Enchantée",
        6: "Épique"
    };

    // 2. Regroupement par niveau de rareté réel
    const groupedByRarity = {};
    collectorCardsList.forEach(card => {
        const rKey = card.rarity; // 6, 7 ou 8
        if (!groupedByRarity[rKey]) groupedByRarity[rKey] = [];
        groupedByRarity[rKey].push(card);
    });

    container.innerHTML = '';

    const summaryBanner = document.createElement('div');
    summaryBanner.style.cssText = "background: rgba(243, 206, 120, 0.1); border: 1px solid var(--gold); border-radius: 8px; padding: 10px; text-align: center; font-family: 'Cinzel', serif; color: var(--gold-light); font-size: 0.85rem; margin-bottom: 5px;";
    summaryBanner.innerHTML = `Vitrine de la collection : <strong style="color: var(--gold);">${collectorCardsList.length} carte${collectorCardsList.length > 1 ? 's' : ''} d'exception</strong>`;
    container.appendChild(summaryBanner);

    // 3. Ordre d'affichage (du plus rare / haut niveau au plus bas : 8, 7, 6)
    [8, 7, 6].forEach(rarityLevel => {
        const cards = groupedByRarity[rarityLevel];
        if (!cards || cards.length === 0) return; // Omis si vide

        // Tri des cartes du plus petit chapitre au plus grand au sein de chaque rareté
        cards.sort((a, b) => {
            const numA = parseInt(String(a.chapter).replace(/\D/g, '')) || 0;
            const numB = parseInt(String(b.chapter).replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        const rarityName = rarityConfig[rarityLevel] || `Rareté ${rarityLevel}`;

        const section = document.createElement('div');
        section.className = 'missing-chapter-section';

        section.innerHTML = `
            <div class="missing-chapter-title">${rarityName} (${cards.length} carte${cards.length > 1 ? 's' : ''})</div>
            <div class="missing-cards-grid" id="collector-grid-rarity-${rarityLevel}"></div>
        `;
        container.appendChild(section);

        const grid = section.querySelector('.missing-cards-grid');

        cards.forEach(card => {
            const cardItem = document.createElement('div');
            cardItem.className = 'missing-card-item';

            // Affichage : "Chapitre X - Nom de la carte"
            const displayTitle = `${card.chapter} - ${card.name}`;

            cardItem.innerHTML = `
                <div class="missing-card-img-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 0.6rem; color: var(--text-muted);">...</span>
                </div>
                <div class="missing-card-name" title="${displayTitle}">${displayTitle}</div>
            `;
            grid.appendChild(cardItem);

            fetchCollectorCardImage(card.setCode, card.cardNumber, cardItem);
        });
    });
}

async function fetchCollectorCardImage(setCode, cardNumber, itemElement) {
    const imgWrapper = itemElement.querySelector('.missing-card-img-wrapper');
    try {
        const response = await fetch(`https://api.lorcast.com/v0/cards/${setCode}/${cardNumber}`, { mode: 'cors' });
        if (!response.ok) throw new Error();

        const data = await response.json();
        const imageUrl = data.image_uris?.digital?.normal || '';
        const layout = data.layout || 'normal'; // 'landscape' pour les lieux !

        if (imageUrl) {
            imgWrapper.innerHTML = `<img src="${imageUrl}" class="missing-card-img" alt="Carte">`;
            // On passe un objet à la fonction de zoom
            imgWrapper.onclick = () => openCollectorZoom({ imageUrl, layout });
        } else {
            imgWrapper.innerHTML = `<span style="font-size: 0.6rem; color: #ff6b6b; display: flex; align-items: center; justify-content: center; height: 100%;">Indisponible</span>`;
            imgWrapper.style.cursor = 'default';
        }
    } catch (err) {
        imgWrapper.innerHTML = `<span style="font-size: 0.6rem; color: #ff6b6b; display: flex; align-items: center; justify-content: center; height: 100%;">Erreur API</span>`;
        imgWrapper.style.cursor = 'default';
    }
}

// ==========================================
// SYNCHRONISATION GOOGLE SHEETS & DASHBOARD
// ==========================================
async function fetchSheetData() {
    try {
        const response = await fetch(SCRIPT_URL, { mode: 'cors' });
        const data = await response.json();
        
        chaptersData = data.chaptersData;
        missingCardsList = data.missingCards || [];
        collectorCardsList = data.collectorCards || [];
        
        const globalOwned = data.global.owned;
        const globalMax = data.global.max;
        const globalPercent = data.global.percent;

        document.getElementById('global-fill').style.width = globalPercent + '%';
        document.getElementById('global-numbers').innerText = `${globalOwned} / ${globalMax} cartes`;
        document.getElementById('global-percent').innerText = globalPercent + '%';
        document.getElementById('sync-status').innerText = "Dernière synchro Google Sheets : " + new Date().toLocaleTimeString();

        initDashboard();
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        document.getElementById('sync-status').innerText = "⚠️ Erreur de connexion avec Google Sheets";
    }
}

function initDashboard() {
    if (!chaptersData || Object.keys(chaptersData).length === 0) return;

    const yearsMap = { 1: [], 2: [], 3: [], 4: [] };
    Object.keys(chaptersData).forEach(key => {
        const chap = chaptersData[key];
        if (chap && yearsMap[chap.year]) {
            yearsMap[chap.year].push(key);
        }
    });

    Object.keys(yearsMap).forEach(yearNum => {
        const container = document.getElementById(`year-${yearNum}-grid`);
        if (!container) return;
        container.innerHTML = '';

        yearsMap[yearNum].forEach(key => {
            const chap = chaptersData[key];
            if (!chap) return;

            const percent = chap.released && chap.max > 0 ? ((chap.owned / chap.max) * 100).toFixed(0) : 0;
            const isSelected = selectedKey === key;
            const isCompleted = chap.released && chap.owned >= chap.max && chap.max > 0;

            const card = document.createElement('div');
            card.className = `chapter-card ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed-100' : ''} ${!chap.released ? 'tba' : ''}`;
            card.onclick = () => selectChapter(key);

            if (chap.released) {
                card.innerHTML = `
                    <div class="chapter-name">${key} ${isCompleted ? '✨' : ''}</div>
                    <img src="${chap.icon}" class="chapter-icon" alt="${key}" onerror="this.style.display='none'">
                    <div class="chapter-bar-container">
                        <div class="chapter-bar-fill" style="width: ${percent}%;"></div>
                    </div>
                    <div class="chapter-stats">${chap.owned}/${chap.max} (${percent}%)</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="chapter-name">${key}</div>
                    <img src="${chap.icon}" class="chapter-icon" alt="${key}" onerror="this.style.display='none'">
                    <div class="chapter-bar-container">
                        <div class="chapter-bar-fill" style="width: 0%;"></div>
                    </div>
                    <div class="chapter-stats" style="color: var(--text-muted);">À venir (TBA)</div>
                `;
            }
            container.appendChild(card);
        });
    });

    renderRarities();
}

function selectChapter(key) {
    selectedKey = (selectedKey === key) ? null : key;
    initDashboard();
}

function resetSelection() {
    selectedKey = null;
    initDashboard();
}

function renderRarities() {
    const container = document.getElementById('rarities-container');
    const title = document.getElementById('rarities-title');
    const resetHint = document.getElementById('reset-hint');
    const detailsIcon = document.getElementById('details-icon');
    container.innerHTML = '';

    const row1Names = ["Commune", "Peu Commune", "Rare", "Super Rare", "Légendaire"];
    const row2Names = ["Épique", "Enchantée", "Iconique"];

    if (!selectedKey) {
        title.innerText = "Récapitulatif Global par Rareté (Tous chapitres sortis cumulés)";
        resetHint.style.display = 'none';
        detailsIcon.style.display = 'none';

        const computedGlobalRarities = {};
        Object.values(chaptersData).forEach(chap => {
            if (chap.released && chap.rarities) {
                Object.keys(chap.rarities).forEach(rName => {
                    const parts = chap.rarities[rName].split('/');
                    const owned = parseInt(parts[0]) || 0;
                    const total = parseInt(parts[1]) || 0;
                    if (total > 0) {
                        if (!computedGlobalRarities[rName]) {
                            computedGlobalRarities[rName] = { owned: 0, total: 0 };
                        }
                        computedGlobalRarities[rName].owned += owned;
                        computedGlobalRarities[rName].total += total;
                    }
                });
            }
        });

        const globalRaritiesFormatted = {};
        Object.keys(computedGlobalRarities).forEach(rName => {
            globalRaritiesFormatted[rName] = `${computedGlobalRarities[rName].owned} / ${computedGlobalRarities[rName].total}`;
        });

        buildTwoRowsGrid(container, globalRaritiesFormatted, row1Names, row2Names);
    } else {
        const chap = chaptersData[selectedKey];
        if (!chap.released) {
            title.innerText = `Détail des Raretés : ${chap.name} (À venir)`;
            resetHint.style.display = 'block';
            detailsIcon.src = chap.icon;
            detailsIcon.style.display = 'block';
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 15px; font-style: italic; font-family: 'Cinzel', serif;">Ce chapitre n'est pas encore sorti. Aucune statistique de rareté disponible.</div>`;
            return;
        }

        title.innerText = `Détail des Raretés : ${chap.name}`;
        resetHint.style.display = 'block';
        detailsIcon.src = chap.icon;
        detailsIcon.style.display = 'block';

        buildTwoRowsGrid(container, chap.rarities, row1Names, row2Names);
    }
}

function buildTwoRowsGrid(container, dataObj, row1Keys, row2Keys) {
    const row1 = document.createElement('div');
    row1.className = 'rarities-row-flex';
    row1Keys.forEach(name => {
        if (dataObj && dataObj[name]) {
            const parts = dataObj[name].split('/');
            const totalVal = parts.length > 1 ? parseInt(parts[1].trim()) : 1;
            if (totalVal > 0) {
                const iconUrl = rarityIcons[name] || '';
                row1.innerHTML += `
                    <div class="rarity-card">
                        ${iconUrl ? `<img src="${iconUrl}" class="rarity-icon" alt="${name}">` : ''}
                        <div class="rarity-name">${name}</div>
                        <div class="rarity-value">${dataObj[name]}</div>
                    </div>
                `;
            }
        }
    });

    const row2 = document.createElement('div');
    row2.className = 'rarities-row-flex';
    row2Keys.forEach(name => {
        if (dataObj && dataObj[name]) {
            const parts = dataObj[name].split('/');
            const totalVal = parts.length > 1 ? parseInt(parts[1].trim()) : 1;
            if (totalVal > 0) {
                const iconUrl = rarityIcons[name] || '';
                row2.innerHTML += `
                    <div class="rarity-card">
                        ${iconUrl ? `<img src="${iconUrl}" class="rarity-icon" alt="${name}">` : ''}
                        <div class="rarity-name">${name}</div>
                        <div class="rarity-value">${dataObj[name]}</div>
                    </div>
                `;
            }
        }
    });

    if (row1.children.length > 0) container.appendChild(row1);
    if (row2.children.length > 0) container.appendChild(row2);
}

window.onload = fetchSheetData;
