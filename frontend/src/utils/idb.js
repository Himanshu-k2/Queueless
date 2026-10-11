import { openDB } from 'idb';

const DB_NAME = 'QueueLessDB';
const STORE_NAME = 'pendingActions';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const savePendingAction = async (action) => {
  const db = await initDB();
  const id = await db.add(STORE_NAME, {
    ...action,
    timestamp: new Date().getTime(),
    syncing: false, // flag to prevent duplicate syncs
  });
  return id;
};

export const getPendingActions = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const markActionSyncing = async (id, isSyncing) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const action = await store.get(id);
  if (action) {
    action.syncing = isSyncing;
    await store.put(action);
  }
  await tx.done;
};

export const removePendingAction = async (id) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};
