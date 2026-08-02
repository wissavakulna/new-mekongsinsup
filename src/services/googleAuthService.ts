import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App if not initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถดึง Access Token จาก Google Sign-In ได้');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export function useGoogleAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [accessToken, setAccessTokenState] = useState<string | null>(cachedAccessToken);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAccessTokenState(null);
      } else if (cachedAccessToken) {
        setAccessTokenState(cachedAccessToken);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<string | null> => {
    const res = await googleSignIn();
    if (res) {
      setUser(res.user);
      setAccessTokenState(res.accessToken);
      return res.accessToken;
    }
    return null;
  };

  const logout = async () => {
    await logoutGoogle();
    setUser(null);
    setAccessTokenState(null);
  };

  return {
    isLoggedIn: !!user,
    userProfile: user ? { email: user.email, name: user.displayName } : null,
    accessToken,
    signInWithGoogle,
    logout,
    getAccessToken: () => cachedAccessToken
  };
}
