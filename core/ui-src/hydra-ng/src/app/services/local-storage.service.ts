import {Injectable} from "@angular/core";

@Injectable({
    providedIn: "root"
})
export class LocalStorageService {

    constructor() {
    }

    /**
     * Save a value to local storage
     */
    setItem(key: string, value: any): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("Error saving to localStorage:", error);
        }
    }

    /**
     * Get a value from local storage
     */
    getItem<T>(key: string, defaultValue?: T): T | null {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue || null;
            }
            return JSON.parse(item) as T;
        } catch (error) {
            console.error("Error reading from localStorage:", error);
            return defaultValue || null;
        }
    }

    /**
     * Remove an item from local storage
     */
    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error("Error removing from localStorage:", error);
        }
    }

    /**
     * Clear all local storage
     */
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error("Error clearing localStorage:", error);
        }
    }

    /**
     * Check if a key exists in local storage
     */
    hasItem(key: string): boolean {
        try {
            return localStorage.getItem(key) !== null;
        } catch (error) {
            console.error("Error checking localStorage:", error);
            return false;
        }
    }
} 