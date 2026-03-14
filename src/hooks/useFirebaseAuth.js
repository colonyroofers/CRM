import { useState, useEffect, useCallback } from 'react';
import { loadFirebase, getFirebaseAuth, getGoogleProvider } from '../utils/firebase.js';

export function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsub = null;

    loadFirebase().then(ok => {
      if (!ok) {
        setError("Could not connect to Firebase. Check that /api/config is returning your Firebase configuration.");
        setLoading(false);
        return;
      }

      const firebaseAuth = getFirebaseAuth();
      unsub = firebaseAuth.onAuthStateChanged(fb => {
        setUser(
          fb
            ? {
                name: fb.displayName,
                email: fb.email,
                picture: fb.photoURL,
                uid: fb.uid
              }
            : null
        );
        setLoading(false);
      });
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      setError(null);
      const firebaseAuth = getFirebaseAuth();
      const googleProvider = getGoogleProvider();
      await firebaseAuth.signInWithPopup(googleProvider);
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        setError("Sign-in failed: " + e.message);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const firebaseAuth = getFirebaseAuth();
    if (firebaseAuth) {
      await firebaseAuth.signOut();
    }
  }, []);

  return { user, loading, error, signIn, signOut };
}
