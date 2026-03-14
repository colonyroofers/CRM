// Firebase configuration and initialization
// Using the compat SDK (loaded via CDN) to minimize changes from monolithic app

let FIREBASE_CONFIG = null;

export async function loadFirebaseConfig() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      FIREBASE_CONFIG = await res.json();
      return true;
    }
    console.error("Config endpoint returned status:", res.status);
  } catch (e) {
    console.error("Config load error:", e);
  }
  return false;
}

// Module-level mutable refs
let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;
let firestoreDb = null;
let firebaseStorage = null;
let firebaseLoaded = false;

export async function loadFirebase() {
  if (firebaseLoaded) return true;

  try {
    if (!FIREBASE_CONFIG) {
      const ok = await loadFirebaseConfig();
      if (!ok) {
        console.error("Could not load Firebase config from /api/config");
        return false;
      }
    }

    if (!window.firebase) {
      console.error("Firebase SDK not loaded from CDN");
      return false;
    }

    // Guard against double-init (e.g. hot reload)
    if (firebase.apps && firebase.apps.length > 0) {
      firebaseApp = firebase.apps[0];
    } else {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    }

    firebaseAuth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    firestoreDb = firebase.firestore();

    // Enable offline persistence
    firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('Offline: multi-tab not supported');
      }
      if (err.code === 'unimplemented') {
        console.warn('Offline: not supported in this browser');
      }
    });

    firebaseStorage = firebase.storage();
    firebaseLoaded = true;
    console.log("Firebase loaded successfully");
    return true;
  } catch (e) {
    console.error("Firebase load error:", e);
    return false;
  }
}

// Getter functions to access Firebase modules
export function getFirebaseApp() {
  return firebaseApp;
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getFirestoreDb() {
  return firestoreDb;
}

export function getFirebaseStorage() {
  return firebaseStorage;
}

export function getGoogleProvider() {
  return googleProvider;
}

export function isFirebaseLoaded() {
  return firebaseLoaded;
}

/**
 * Firestore Helpers
 */
export async function saveSubmission(data) {
  const id = data.id || "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const record = {
    ...data,
    id,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString()
  };

  try {
    const db = getFirestoreDb();
    if (!db) throw new Error("Firestore not initialized");
    await db.collection("submissions").doc(id).set(record);
    return record;
  } catch (e) {
    console.error("Save failed:", e);
    return null;
  }
}

export async function loadAllSubmissions() {
  try {
    const db = getFirestoreDb();
    if (!db) throw new Error("Firestore not initialized");
    const snap = await db.collection("submissions").orderBy("createdAt", "desc").get();
    const subs = [];
    snap.forEach(d => subs.push(d.data()));
    return subs;
  } catch (e) {
    console.error("Load failed:", e);
    return [];
  }
}

export async function deleteSubmission(id) {
  try {
    const db = getFirestoreDb();
    if (!db) throw new Error("Firestore not initialized");
    await db.collection("submissions").doc(id).delete();
    return true;
  } catch (e) {
    return false;
  }
}
