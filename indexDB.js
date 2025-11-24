// Initialize IndexedDB
const dbName = 'beerDB';
const storeName = 'beers';

let db;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
};

// Add or update a beer in the database
async function addBeerToDb(beer) {
  if (!db) await openDB();
  
  // Assign id if missing
  if (!beer.id) {
    beer.id = Date.now();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(beer);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(beer);
  });
}

// Get all beers from the database
async function getAllBeersFromDb() {
  if (!db) await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Expose functions globally
window.addBeerToDb = addBeerToDb;
window.getAllBeersFromDb = getAllBeersFromDb;

// Initialize DB on load
openDB().catch(err => console.error('Failed to open IndexedDB:', err));
