// Tiny IndexedDB cache for raw API JSON blobs with a 24h TTL. All operations
// fail soft — a missing/blocked IndexedDB just means no caching.

const DB_NAME = "orbit-iptv";
const STORE = "cache";
const TTL = 24 * 3600 * 1000;

let dbp: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => {
        const v = req.result as { t: number; d: T } | undefined;
        resolve(v && Date.now() - v.t < TTL ? v.d : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet<T>(key: string, data: T): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite")
      .objectStore(STORE)
      .put({ t: Date.now(), d: data }, key);
  } catch {
    /* ignore */
  }
}

export async function idbClear(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).clear();
  } catch {
    /* ignore */
  }
}
