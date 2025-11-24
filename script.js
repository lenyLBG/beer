let pageActuelle = 1;
const perPage = 30; // éléments par page
let totalPages = 1;
const compteurDePagesElement = document.getElementById("CompteurDePages");
const paginationControles = document.getElementById("pagination-controles") || document.getElementById("pagination-controls");

function updateCompteurDePages() {
  if (!compteurDePagesElement) return;
  compteurDePagesElement.textContent = `Page ${pageActuelle} / ${totalPages}`;
}

// debounce helper for search input
function debounce(fn, wait = 250) {
  let t = null;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function modelFetchBeers(page) {
  // Determine where to render cards: prefer #card-container, then .beer-list, then .beer-card
  const findOrCreateContainer = () => {
    let cardContainer = document.getElementById("card-container");
    if (cardContainer) return cardContainer;
    cardContainer = document.querySelector('.beer-list');
    if (cardContainer) return cardContainer;
    cardContainer = document.querySelector('.beer-card');
    if (cardContainer) return cardContainer;

    // fallback: create container inside <main>
    const main = document.querySelector('main') || document.body;
    const created = document.createElement('div');
    created.id = 'card-container';
    created.className = 'beer-list';
    main.appendChild(created);
    return created;
  };

  const cardContainer = findOrCreateContainer();
  // show a tiny loading indicator
  const previous = cardContainer.innerHTML;
  cardContainer.innerHTML = '<div class="spinner" aria-hidden="true"></div>';

  // Prefer the official Punk API; fallback to other hosts if needed
  // try primary API, then fallback host if primary fails
  const primary = (p) => `https://api.punkapi.com/v2/beers?page=${p}&per_page=25`;
  const fallback = (p) => `https://punkapi.online/v3/beers?page=${p}&per_page=25`;

  const fetchWithFallback = async (urlFn, pageNum) => {
    let lastError = null;
    const urls = [primary(pageNum), fallback(pageNum)];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        return json;
      } catch (err) {
        console.warn('fetch failed for', url, err.message);
        lastError = err;
      }
    }
    throw lastError;
  };

  // Fetch multiple pages from API (5 pages = ~125 beers)
  (async () => {
    try {
      let allBeers = [];
      for (let apiPage = 1; apiPage <= 5; apiPage++) {
        try {
          const data = await fetchWithFallback(null, apiPage);
          if (!Array.isArray(data) || data.length === 0) {
            console.log(`API page ${apiPage} is empty, stopping.`);
            break;
          }
          console.log(`Fetched API page ${apiPage}: ${data.length} beers`);
          allBeers = allBeers.concat(data);
        } catch (err) {
          console.warn(`Failed to fetch API page ${apiPage}:`, err.message);
          break;
        }
      }

      if (allBeers.length === 0) {
        cardContainer.innerHTML = '<p class="muted">Aucune bière trouvée.</p>';
        return;
      }

      console.log('Total beers fetched from API:', allBeers.length);

      // Save all beers to IndexedDB
      console.log('Saving beers to IndexedDB...');
      for (const beer of allBeers) {
        try {
          await addBeerToDb(beer);
        } catch (err) {
          console.warn('Failed to save beer', beer.id, err);
        }
      }
      console.log('All beers saved to IndexedDB.');

      // Render from IndexedDB with client-side pagination
      if (typeof window.getAllBeersFromDb === 'function') {
        try {
          const allFromDb = await window.getAllBeersFromDb();
          totalPages = Math.max(1, Math.ceil((allFromDb.length || 0) / perPage));
          // clamp pageActuelle
          if (pageActuelle > totalPages) pageActuelle = totalPages;
          const start = (pageActuelle - 1) * perPage;
          const slice = allFromDb.slice(start, start + perPage);
          cardContainer.innerHTML = slice.length ? slice.map(renderBeer).join('') : '<p class="muted">Aucune bière trouvée dans la base.</p>';
          // update navigation buttons
          setNavButtonsState();
          // attach handlers so cards open modal reliably
          attachCardHandlers(cardContainer, slice);
        } catch (err) {
          console.error('Failed to read beers from DB for rendering:', err);
          cardContainer.innerHTML = allBeers.map((beer) => renderBeer(beer)).join("");
          attachCardHandlers(cardContainer, allBeers);
          totalPages = Math.max(1, Math.ceil(allBeers.length / perPage));
          setNavButtonsState();
        }
      } else {
        cardContainer.innerHTML = allBeers.map((beer) => renderBeer(beer)).join("");
        attachCardHandlers(cardContainer, allBeers);
        totalPages = Math.max(1, Math.ceil(allBeers.length / perPage));
        setNavButtonsState();
      }

      // add entrance animation class with a small stagger
      requestAnimationFrame(() => {
        const cards = cardContainer.querySelectorAll('.beer, .card');
        cards.forEach((c, idx) => {
          setTimeout(() => c.classList.add('card-in'), idx * 40);
        });
      });
    } catch (error) {
      console.error("Error fetching beers:", error);
      // restore previous content or show a friendly message
      cardContainer.innerHTML = previous || `<p class="muted">Impossible de charger les bières pour le moment. ${error.message}</p>`;
    }
  })();
}

const btnSuivantTop = document.getElementById("btn-suivant-top");
if (btnSuivantTop) {
  btnSuivantTop.addEventListener("click", () => {
    if (pageActuelle < totalPages) {
      pageActuelle++;
      modelFetchBeers(pageActuelle);
      updateCompteurDePages();
    }
  });
} else {
  console.debug('btn-suivant-top introuvable — pas d\'écouteur ajouté');
}

const btnPrecedentTop = document.getElementById("btn-precedent-top");
if (btnPrecedentTop) {
  btnPrecedentTop.addEventListener("click", () => {
    if (pageActuelle > 1) {
      pageActuelle--;
      modelFetchBeers(pageActuelle);
      updateCompteurDePages();
    }
  });
} else {
  console.debug('btn-precedent-top introuvable — pas d\'écouteur ajouté');
}

// helper to enable/disable nav buttons
function setNavButtonsState() {
  const prev = document.getElementById('btn-precedent-top');
  const next = document.getElementById('btn-suivant-top');
  if (prev) prev.disabled = pageActuelle <= 1;
  if (next) next.disabled = pageActuelle >= totalPages;
  updateCompteurDePages();

  // populate page selector if present
  const pageSelect = document.getElementById('pageSelect');
  if (pageSelect) {
    // avoid re-creating if already correct
    if (pageSelect.options.length !== totalPages) {
      // clear
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.text = String(i);
        pageSelect.appendChild(opt);
      }
    }
    // set current
    pageSelect.value = String(pageActuelle);
  }
}

// Jump to page when selector changes
const pageSelectEl = document.getElementById('pageSelect');
if (pageSelectEl) {
  pageSelectEl.addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10) || 1;
    if (v >= 1 && v <= totalPages) {
      pageActuelle = v;
      modelFetchBeers(pageActuelle);
      setNavButtonsState();
    }
  });
}

updateCompteurDePages();
modelFetchBeers(pageActuelle);


/**
 * Render a beer card. Chooses image in this order:
 * 1) beer.imageData (DataURL stored for user-added images)
 * 2) beer.imagePath (local path such as 'img/biere.jpg')
 * 3) beer.image (API-provided filename) via punkapi.online
 * 4) default local image 'img/biere.jpg'
 */
function renderBeer(beer) {
  const defaultImg = 'img/biere.jpg';
  let src = defaultImg;

  if (beer.imageData) {
    src = beer.imageData;
  } else if (beer.imagePath) {
    src = beer.imagePath;
  } else if (beer.image) {
    // some API entries include an `image` filename
    src = `https://punkapi.online/v3/images/${beer.image}`;
  }

  const name = beer.name || 'Bière sans nom';
  const tagline = beer.tagline || '';
  const desc = (beer.description || '').slice(0, 160);
  const abv = beer.abv ?? beer.alcoholContent ?? '-';
  const ibu = beer.ibu ?? '-';

  return `
    <div class="beer card border rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow" role="button" tabindex="0" style="cursor:pointer;">
      <img src="${src}" alt="${name}" onerror="this.onerror=null;this.src='${defaultImg}';" style="max-width:120px;max-height:200px;object-fit:contain;" />
      <h2>${name}</h2>
      <p class="muted">${tagline}</p>
      <p class="beer-desc">${desc}</p>
      <div class="beer-meta">
        <span class="accent">ABV</span> ${abv} &nbsp;•&nbsp; <span class="accent">IBU</span> ${ibu}
      </div>
    </div>
  `;
}

// Attach click and keyboard handlers to rendered beer cards.
function attachCardHandlers(container, beers) {
  if (!container || !Array.isArray(beers)) return;
  const cards = Array.from(container.querySelectorAll('.beer'));
  cards.forEach((card, idx) => {
    // remove previous handlers to avoid duplicates
    card.onclick = null;
    card.onkeydown = null;
    const beer = beers[idx];
    if (!beer) return;
    card.addEventListener('click', () => {
      if (typeof window.openBeerModal === 'function') window.openBeerModal(beer);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (typeof window.openBeerModal === 'function') window.openBeerModal(beer);
      }
    });
  });
}

// safe search bar handling — search across all saved beers (IndexedDB) when available
const searchBar = document.getElementById('searchBar');
if (searchBar) {
  const doSearch = debounce(async (event) => {
    const q = (event.target.value || '').trim().toLowerCase();
    const container = document.getElementById('card-container') || document.querySelector('.beer-list');
    if (!container) return;

    if (typeof window.getAllBeersFromDb === 'function') {
      try {
        const all = await window.getAllBeersFromDb();
        const filtered = all.filter(b => {
          const text = ((b.name || '') + ' ' + (b.tagline || '') + ' ' + (b.description || '')).toLowerCase();
          return text.includes(q);
        });
        
        // Update pagination for filtered results
        totalPages = Math.max(1, Math.ceil((filtered.length || 0) / perPage));
        pageActuelle = 1;
        
        const start = (pageActuelle - 1) * perPage;
        const slice = filtered.slice(start, start + perPage);
        
        container.innerHTML = slice.length ? slice.map(renderBeer).join('') : '<p class="muted">Aucun résultat.</p>';
        // attach handlers for the filtered slice
        attachCardHandlers(container, slice);
        setNavButtonsState();
        requestAnimationFrame(() => {
          const cards = container.querySelectorAll('.beer, .card');
          cards.forEach((c, idx) => setTimeout(() => c.classList.add('card-in'), idx * 40));
        });
        return;
      } catch (err) {
        console.error('Search failed (IndexedDB):', err);
      }
    }

    // fallback to current visible cards
    const cards = Array.from(container.querySelectorAll('.beer, .card'));
    cards.forEach(card => {
      const text = (card.innerText || '').toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  }, 250);

  searchBar.addEventListener('input', doSearch);
}

const namesearchBar = document.getElementById('nameSearchBar');
if (namesearchBar) {
  const doNameSearch = debounce(async (event) => {
    const q = (event.target.value || '').trim().toLowerCase();
    const container = document.getElementById('card-container') || document.querySelector('.beer-list');
    if (!container) return;

    if (typeof window.getAllBeersFromDb === 'function') {
      try {
        const all = await window.getAllBeersFromDb();
        const filtered = all.filter(b => (b.name || '').toLowerCase().includes(q));
        
        // Update pagination for filtered results
        totalPages = Math.max(1, Math.ceil((filtered.length || 0) / perPage));
        pageActuelle = 1;
        
        const start = (pageActuelle - 1) * perPage;
        const slice = filtered.slice(start, start + perPage);
        
        container.innerHTML = slice.length ? slice.map(renderBeer).join('') : '<p class="muted">Aucun résultat.</p>';
        // attach handlers for the filtered slice
        attachCardHandlers(container, slice);
        setNavButtonsState();
        requestAnimationFrame(() => {
          const cards = container.querySelectorAll('.beer, .card');
          cards.forEach((c, idx) => setTimeout(() => c.classList.add('card-in'), idx * 40));
        });
        return;
      } catch (err) {
        console.error('Name search failed (IndexedDB):', err);
      }
    }

    const cards = Array.from(container.querySelectorAll('.beer, .card'));
    cards.forEach(card => {
      const text = (card.innerText || '').toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  }, 250);

  namesearchBar.addEventListener('input', doNameSearch);
}
