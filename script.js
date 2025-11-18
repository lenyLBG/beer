let pageActuelle = 1;
const compteurDePagesElement = document.getElementById("CompteurDePages");
const paginationControles = document.getElementById("pagination-controls");

function updateCompteurDePages() {
  compteurDePagesElement.textContent = `page: ${pageActuelle}`;
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
  const primary = `https://api.punkapi.com/v2/beers?page=${page}&per_page=25`;
  const fallback = `https://punkapi.online/v3/beers?page=${page}`;

  const fetchWithFallback = async (urls) => {
    let lastError = null;
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

  fetchWithFallback([primary, fallback])
    .then((data) => {
      console.log('Beers fetched:', data && data.length);
      if (!Array.isArray(data) || data.length === 0) {
        cardContainer.innerHTML = '<p class="muted">Aucune bière trouvée.</p>';
        return;
      }
      cardContainer.innerHTML = data.map((beer) => template(beer)).join("");
      // add entrance animation class with a small stagger
      requestAnimationFrame(() => {
        const cards = cardContainer.querySelectorAll('.beer, .card');
        cards.forEach((c, idx) => {
          setTimeout(() => c.classList.add('card-in'), idx * 40);
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching beers:", error);
      // restore previous content or show a friendly message
      cardContainer.innerHTML = previous || `<p class="muted">Impossible de charger les bières pour le moment. ${error.message}</p>`;
    });
}

const btnSuivantTop = document.getElementById("btn-suivant-top");
if (btnSuivantTop) {
  btnSuivantTop.addEventListener("click", () => {
    pageActuelle++;
    modelFetchBeers(pageActuelle);
    updateCompteurDePages();
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

updateCompteurDePages();
modelFetchBeers(pageActuelle);


var template = (beer) => `
  <div class="beer card border rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow">
    <img src="https://punkapi.online/v3/images/${beer.image}" alt="${beer.name}" />
    <h2>${beer.name}</h2>
    <p class="muted">${beer.tagline || ''}</p>
    <p class="beer-desc">${(beer.description || '').slice(0, 160)}</p>
    <div class="beer-meta">
      <span class="accent">ABV</span> ${beer.abv ?? '-'} &nbsp;•&nbsp; <span class="accent">IBU</span> ${beer.ibu ?? '-'}
    </div>
  </div>
`;

// safe search bar handling
const searchBar = document.getElementById('searchBar');
if (searchBar) {
  searchBar.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    // simple client-side filter: show/hide cards
    const container = document.getElementById('card-container') || document.querySelector('.beer-list');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.beer, .card'));
    cards.forEach(card => {
      const text = (card.innerText || '').toLowerCase();
      card.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

const namesearchBar = document.getElementById('nameSearchBar');
if (namesearchBar) {
  namesearchBar.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    // simple client-side filter: show/hide cards
    const container = document.getElementById('card-container') || document.querySelector('.beer-list');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.beer, .card'));
    cards.forEach(card => {
      const text = (card.innerText || '').toLowerCase();
      card.style.display = text.includes(query) ? '' : 'none';
    });
  });
}
window.addEventListener('load', async (event) => {
  
  async function initDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('beerDB', 1);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (db.objectStoreNames.contains('beers')) {
          const objectStore = db.createObjectStore('beers', { keyPath: 'id' });
          objectStore.createIndex('Beer', 'beerName', { unique: false });
        }
      };

      request.onsuccess = event => {
        const db = event.target.result;
      };

      request.onerror = event => {
        console.error('IndexedDB error:', event.target.errorCode);
      };


    });
  }
  const db = await initDb();

  async function addBeerToDb(beer) {
    const transaction = db.transaction(['beers'], 'readwrite');
    const objectStore = transaction.objectStore('beers');
    await objectStore.add(beer);
  }
});