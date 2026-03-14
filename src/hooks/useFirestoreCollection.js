import { useState, useEffect, useRef, useCallback } from 'react';
import { getFirestoreDb } from '../utils/firebase.js';

/**
 * Hook for syncing data with Firestore with localStorage fallback
 * @param {string} collectionName - Firestore collection name
 * @param {*} fallbackData - Default data if nothing is stored
 * @param {function} stripFn - Optional function to strip data before storage
 * @returns {[data, save, loaded]} - [data, saveFunction, isLoaded]
 */
export function useFirestoreCollection(collectionName, fallbackData, stripFn) {
  const [data, setData] = useState(fallbackData);
  const [loaded, setLoaded] = useState(false);
  const skipNextSync = useRef(false);

  useEffect(() => {
    const firestoreDb = getFirestoreDb();

    if (!firestoreDb) {
      // Fallback to localStorage if Firestore not ready
      try {
        const s = localStorage.getItem(collectionName);
        if (s) setData(JSON.parse(s));
      } catch (e) {
        console.warn("Storage/parse error:", e.message);
      }
      setLoaded(true);
      return;
    }

    const unsub = firestoreDb
      .collection(collectionName)
      .doc("data")
      .onSnapshot(
        snap => {
          if (skipNextSync.current) {
            skipNextSync.current = false;
            return;
          }

          if (snap.exists) {
            const items = snap.data().items;
            if (items) setData(items);
          }
          setLoaded(true);
        },
        err => {
          console.error(`Firestore ${collectionName} listen error:`, err);

          // Fallback to localStorage
          try {
            const s = localStorage.getItem(collectionName);
            if (s) setData(JSON.parse(s));
          } catch (e) {
            console.warn("Storage/parse error:", e.message);
          }
          setLoaded(true);
        }
      );

    return () => unsub();
  }, []);

  const save = useCallback(
    (newData) => {
      setData(newData);
      const toStore = stripFn ? stripFn(newData) : newData;

      // Always save to localStorage as backup
      try {
        localStorage.setItem(collectionName, JSON.stringify(toStore));
      } catch (e) {
        console.warn("Storage/parse error:", e.message);
      }

      // Save to Firestore
      const firestoreDb = getFirestoreDb();
      if (firestoreDb) {
        skipNextSync.current = true;
        firestoreDb
          .collection(collectionName)
          .doc("data")
          .set({
            items: toStore,
            updatedAt: new Date().toISOString()
          })
          .catch(err => {
            console.error(`Firestore ${collectionName} save error:`, err);
            skipNextSync.current = false;
          });
      }
    },
    [collectionName, stripFn]
  );

  return [data, save, loaded];
}
