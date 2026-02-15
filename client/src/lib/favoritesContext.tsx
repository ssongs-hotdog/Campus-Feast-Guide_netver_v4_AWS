import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FavoritesContextType {
    favoritedCornerIds: string[];
    addFavorite: (cornerId: string) => void;
    removeFavorite: (cornerId: string) => void;
    isFavorite: (cornerId: string) => boolean;
    toggleFavorite: (cornerId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favoritedCornerIds, setFavoritedCornerIds] = useState<string[]>([]);
    const { toast } = useToast();

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('hyeat-favorites');
        if (stored) {
            try {
                setFavoritedCornerIds(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse favorites from local storage", e);
            }
        }
    }, []);

    // Save to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('hyeat-favorites', JSON.stringify(favoritedCornerIds));
    }, [favoritedCornerIds]);

    const addFavorite = useCallback((cornerId: string) => {
        setFavoritedCornerIds(prev => {
            if (prev.includes(cornerId)) return prev;
            return [...prev, cornerId];
        });
        // Optional: Toast feedback could go here, but UI might handle it
    }, []);

    const removeFavorite = useCallback((cornerId: string) => {
        setFavoritedCornerIds(prev => prev.filter(id => id !== cornerId));
    }, []);

    const isFavorite = useCallback((cornerId: string) => {
        return favoritedCornerIds.includes(cornerId);
    }, [favoritedCornerIds]);

    const toggleFavorite = useCallback((cornerId: string) => {
        setFavoritedCornerIds(prev => {
            const exists = prev.includes(cornerId);
            const newFavorites = exists
                ? prev.filter(id => id !== cornerId)
                : [...prev, cornerId];

            if (!exists) {
                toast({
                    description: "즐겨찾기에 추가되었습니다.",
                    duration: 1500,
                });
            } else {
                toast({
                    description: "즐겨찾기가 해제되었습니다.",
                    duration: 1500,
                });
            }

            return newFavorites;
        });
    }, [toast]);

    return (
        <FavoritesContext.Provider value={{ favoritedCornerIds, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
