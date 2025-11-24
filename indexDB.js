window.addEventListener('load', async (event) => {

  async function initDb() {
    console.log('Initialisation de la base de données IndexedDB...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('beerDB', 1);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        const objectStore = db.createObjectStore('beers', { keyPath: 'id' });
        objectStore.createIndex('name', 'name', { unique: false });
      };

       request.onsuccess = event => {
         resolve(event.target.result);
       };      request.onerror = event => {
        reject('Error opening IndexedDB');
      };
    });
  }
  const db = await initDb();

  async function addBeerToDb(beer) {
    return new Promise((resolve, reject) => {
      try {
        if (!beer.id) {
          beer.id = Date.now();
        }
        const transaction = db.transaction(['beers'], 'readwrite');
        const objectStore = transaction.objectStore('beers');
        const request = objectStore.put(beer);
        request.onsuccess = () => resolve(beer);
        request.onerror = (e) => reject(new Error('Failed to add beer'));
      } catch (err) {
        reject(err);
      }
    });
  }

  // Expose DB helpers to global scope so other scripts can call them
  window.addBeerToDb = addBeerToDb;

  async function getBeerFromDb(id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['beers'], 'readonly');
      const objectStore = transaction.objectStore('beers');
      const request = id ? objectStore.get(id) : objectStore.getAll();

      request.onsuccess = event => {
        resolve(event.target.result);
      };

      request.onerror = event => {
        reject(new Error('Error getting beer from IndexedDB'));
      };
    });
  }

  async function getAllBeersFromDb() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['beers'], 'readonly');
      const objectStore = transaction.objectStore('beers');
      const request = objectStore.getAll();
      request.onsuccess = e => resolve(e.target.result || []);
      request.onerror = () => reject(new Error('Failed to get beers'));
    });
  }
  window.getAllBeersFromDb = getAllBeersFromDb;
});