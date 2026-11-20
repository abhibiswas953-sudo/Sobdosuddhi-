import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { ensureUserProfile, updateUserProfileSettings } from '../lib/firestoreService';
import type { UserPreferences, UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserVerification: () => Promise<boolean>;
  updatePreferences: (
    updates: Partial<UserPreferences & { displayName: string; photoURL?: string }>
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_THEME_KEY = 'sobdosuddhi_dark_mode';

function applyHtmlTheme(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(LOCAL_THEME_KEY, isDark ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_THEME_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    applyHtmlTheme(darkMode);
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const loadedProfile = await ensureUserProfile(firebaseUser);
          setProfile(loadedProfile);
          if (typeof loadedProfile.darkMode === 'boolean') {
            setDarkMode(loadedProfile.darkMode);
          }
        } catch (err) {
          console.error('Failed to load user profile:', err);
          setProfile({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'লেখক',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            spellingStandard: 'bangla_academy',
            literaryStrictness: 'balanced',
            preservePoeticLicense: true,
            preserveRegionalDialects: true,
            autoSave: true,
            darkMode,
          });
        }
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const registerWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // ignore verification email throttling
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const refreshUserVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const updatedUser = auth.currentUser;
    setUser(updatedUser);
    if (updatedUser.emailVerified) {
      const loaded = await ensureUserProfile(updatedUser);
      setProfile(loaded);
      return true;
    }
    return false;
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences & { displayName: string; photoURL?: string }>) => {
      if (typeof updates.darkMode === 'boolean') {
        setDarkMode(updates.darkMode);
      }
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));

      if (auth.currentUser) {
        if (updates.displayName && updates.displayName.trim()) {
          try {
            await updateProfile(auth.currentUser, { displayName: updates.displayName.trim() });
          } catch {
            // ignore profile displayName error
          }
        }
        if (auth.currentUser.emailVerified) {
          await updateUserProfileSettings(auth.currentUser.uid, updates);
        }
      }
    },
    []
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      setProfile((p) => (p ? { ...p, darkMode: next } : p));
      if (auth.currentUser && auth.currentUser.emailVerified) {
        void updateUserProfileSettings(auth.currentUser.uid, { darkMode: next }).catch(() => {});
      }
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        darkMode,
        toggleDarkMode,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        resendVerificationEmail,
        refreshUserVerification,
        updatePreferences,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
