'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/config/firebase';
import { MentoraUser } from '@/config/types';

interface AuthContextType {
    firebaseUser: User | null;
    mentoraUser: MentoraUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<User>;
    signInWithGoogle: () => Promise<User>;
    signOut: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [mentoraUser, setMentoraUser] = useState<MentoraUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch Mentora user data from Firestore
    const fetchMentoraUser = async (uid: string): Promise<MentoraUser | null> => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { uid, ...docSnap.data() } as MentoraUser;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);
            if (user) {
                const userData = await fetchMentoraUser(user.uid);
                setMentoraUser(userData);
            } else {
                setMentoraUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        return credential.user;
    };

    const signInWithGoogle = async () => {
        const credential = await signInWithPopup(auth, googleProvider);
        return credential.user;
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setMentoraUser(null);
    };

    const refreshUserData = async () => {
        if (firebaseUser) {
            const userData = await fetchMentoraUser(firebaseUser.uid);
            setMentoraUser(userData);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                firebaseUser,
                mentoraUser,
                loading,
                signIn,
                signUp,
                signInWithGoogle,
                signOut,
                refreshUserData,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
