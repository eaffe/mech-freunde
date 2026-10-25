// IndexedDB hält den lokalen Mech, seine freigeschalteten Teile und Trainingssterne.
// Keine Netzwerk- oder Accountverbindung in v0.1.
export class PilotStore {
  constructor() { this.dbPromise = null; }

  connect() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('mech-freunde', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('save')) {
          request.result.createObjectStore('save');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  async load(key = 'pilot') {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const request = db.transaction('save', 'readonly').objectStore('save').get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async save(data, key = 'pilot') {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('save', 'readwrite');
      tx.objectStore('save').put(data, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
