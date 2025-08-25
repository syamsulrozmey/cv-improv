import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create user profile in Firestore
  async function createUserProfile(user, additionalData = {}) {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user;
      const createdAt = serverTimestamp();
      
      const userData = {
        displayName: displayName || additionalData.displayName || '',
        email,
        photoURL: photoURL || '',
        plan: 'freemium', // Default plan
        cvCount: 0,
        maxCvs: 3, // Freemium limit
        createdAt,
        updatedAt: createdAt,
        ...additionalData
      };
      
      try {
        await setDoc(userRef, userData);
        setUserProfile(userData);
        return userData;
      } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
    } else {
      const existingData = userSnap.data();
      setUserProfile(existingData);
      return existingData;
    }
  }

  // Get user profile from Firestore
  async function getUserProfile(userId) {
    if (!userId) return null;
    
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const profileData = userSnap.data();
        setUserProfile(profileData);
        return profileData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Sign up with email and password
  async function signup(email, password, displayName) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Create user profile in Firestore
      await createUserProfile(user, { displayName });
      
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  async function login(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await getUserProfile(user.uid);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Sign in with Google
  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const { user } = await signInWithPopup(auth, provider);
      await createUserProfile(user);
      
      return user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Reset password
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(updates) {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(userRef, updateData, { merge: true });
      
      // Update local state
      setUserProfile(prev => ({ ...prev, ...updateData }));
      
      return updateData;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Check if user can upload more CVs
  function canUploadCV() {
    if (!userProfile) return false;
    
    if (userProfile.plan === 'paid') return true;
    
    return userProfile.cvCount < userProfile.maxCvs;
  }

  // Increment CV count
  async function incrementCVCount() {
    if (!currentUser || !userProfile) throw new Error('No user logged in');
    
    const newCount = (userProfile.cvCount || 0) + 1;
    await updateUserProfile({ cvCount: newCount });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await getUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    canUploadCV,
    incrementCVCount,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}