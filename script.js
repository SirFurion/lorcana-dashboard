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
let selectedKey = null;

// Gestion de la modale
function openMissingModal() {
    document.getElementById('missing-modal').style.display = 'flex';
    renderMissingCardsModal();
}

function closeMissingModal() {
    closeCardZoom();
    document.getElementById('missing-modal').style.display = 'none';
}

// Fonctions de Zoom sur une carte
function openCardZoom(imgUrl) {
    if (!imgUrl) return;
    const zoomOverlay = document.getElementById('card-zoom-overlay');
    const zoomImg = document.getElementById('card-zoom-img');
    const modalBox = document.getElementById('modal-box-container');

    zoomImg.src = imgUrl;
    zoomOverlay.style.display = 'flex';
    modalBox.classList.add('blurred');
}

function closeCardZoom() {
    const zoomOverlay = document.getElementById('card-zoom-overlay');
    const modalBox = document.getElementById('modal-box-container');

    zoomOverlay.style.display = 'none';
    modalBox.classList.remove('blurred');
}

// Affichage, regroupement et calcul des totaux par chapitre dans la modale
async function renderMissingCardsModal() {
    const container = document.getElementById('missing-modal-content');
    
    if (!missingCardsList || missingCardsList.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-style: italic; font-size: 0.85rem; text-align: center; display: block; padding: 20px;">Aucune carte manquante trouvée.</span>`;
        return;
    }

    // Calcul du prix total global de toutes les cartes manquantes
    let totalMissingPrice = 0;
    missingCardsList.forEach(card => {
        if (card.price && !isNaN(card.price)) {
            totalMissingPrice += card.price;
        }
    });

    // Regroupement par chapitre
    const grouped = {};
    missingCardsList.forEach(card => {
        if (!grouped[card.chapter]) {
            grouped[card.chapter] = [];
        }
        grouped[card.chapter].push(card);
    });

    container.innerHTML = '';

    // Bandeau récapitulatif global en haut de la modale
    const summaryBanner = document.createElement('div');
    summaryBanner.style.cssText = "background: rgba(243, 206, 120, 0.1); border: 1px solid var(--gold); border-radius: 8px; padding: 10px; text-align: center; font-family: 'Cinzel', serif; color: var(--gold-light); font-size: 0.85rem; margin-bottom: 5px;";
    summaryBanner.innerHTML = `Valeur estimée totale manquante : <strong style="color: var(--gold);">${totalMissingPrice.toFixed(2).replace('.', ',')} €</strong>`;
    container.appendChild(summaryBanner);

    // Génération des sections par chapitre
    for (const [chapName, cards] of Object.entries(grouped)) {
        const section = document.createElement('div');
        section.className = 'missing-chapter-section';
        
        // Calcul du total des prix pour ce chapitre spécifique
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
            cardItem.className = 'missing-card-item';
            
            const formattedPrice = (card.price && card.price > 0) ? `${card.price.toFixed(2).replace('.', ',')} €` : '';
            const priceBadge = formattedPrice ? `<div class="card-price-badge">${formattedPrice}</div>` : '';
            const priceSubText = formattedPrice ? `<div class="card-price-sub">${formattedPrice}</div>` : `<div class="card-price-sub" style="color: var(--text-muted); font-style: italic;">Prix N/C</div>`;

            cardItem.innerHTML = `
                <div class="missing-card-img-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 0.6rem; color: var(--text-muted);">...</span>
                    ${priceBadge}
                </div>
                <div class="missing-card-name" title="${card.name}">${card.name}</div>
                ${priceSubText}
            `;
            grid.appendChild(cardItem);

            fetchCardImage(card.setCode, card.cardNumber, cardItem);
        });
    }
}

// Appel API Lorcast et configuration du clic pour le zoom
async function fetchCardImage(setCode, cardNumber, itemElement) {
    const imgWrapper = itemElement.querySelector('.missing-card-img-wrapper');
    try {
        const response = await fetch(`https://api.lorcast.com/v0/cards/${setCode}/${cardNumber}`, { mode: 'cors' });
        if (!response.ok) throw new Error();

        const data = await response.json();
        const imageUrl = data.image_uris?.digital?.normal || '';

        if (imageUrl) {
            imgWrapper.innerHTML = `<img src="${imageUrl}" class="missing-card-img" alt="Carte">`;
            imgWrapper.onclick = () => openCardZoom(imageUrl);
        } else {
            imgWrapper.innerHTML = `<span style="font-size: 0.6rem; color: #ff6b6b; display: flex; align-items: center; justify-content: center; height: 100%;">Indisponible</span>`;
            imgWrapper.style.cursor = 'default';
        }
    } catch (err) {
        imgWrapper.innerHTML = `<span style="font-size: 0.6rem; color: #ff6b6b; display: flex; align-items: center; justify-content: center; height: 100%;">Erreur API</span>`;
        imgWrapper.style.cursor = 'default';
    }
}

async function fetchSheetData() {
    try {
        const response = await fetch(SCRIPT_URL, { mode: 'cors' });
        const data = await response.json();
        
        chaptersData = data.chaptersData;
        missingCardsList = data.missingCards || [];
        
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
