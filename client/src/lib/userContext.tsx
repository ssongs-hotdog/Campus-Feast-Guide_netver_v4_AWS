import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the user profile
export interface UserProfile {
    nickname: string;
    department: string;
}

// Define the shape of the context
interface UserContextType {
    user: UserProfile;
    updateProfile: (newProfile: UserProfile) => void;
}

// Default values if no data is found
const DEFAULT_PROFILE: UserProfile = {
    nickname: "하이리온",
    department: "한양대학교 전기공학전공"
};

// Create the context with undefined initial value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Storage key
const STORAGE_KEY = 'hyeat_user_profile';

export function UserProvider({ children }: { children: ReactNode }) {
    // Initialize state from localStorage or use defaults
    const [user, setUser] = useState<UserProfile>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load user profile from storage", e);
        }
        return DEFAULT_PROFILE;
    });

    // Function to update profile and persist to localStorage
    const updateProfile = (newProfile: UserProfile) => {
        setUser(newProfile);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
        } catch (e) {
            console.error("Failed to save user profile to storage", e);
        }
    };

    return (
        <UserContext.Provider value={{ user, updateProfile }}>
            {children}
        </UserContext.Provider>
    );
}

// Custom hook to use the context
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
