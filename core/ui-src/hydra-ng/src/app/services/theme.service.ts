import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {LocalStorageService} from "./local-storage.service";

export type Theme = "light" | "dark";

@Injectable({
    providedIn: "root"
})
export class ThemeService {
    private currentThemeSubject = new BehaviorSubject<Theme>("light");
    public currentTheme$ = this.currentThemeSubject.asObservable();

    constructor(private localStorageService: LocalStorageService) {
        // Load saved theme from localStorage or default to light
        const savedTheme = this.localStorageService.getItem<Theme>("theme", "light");
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            this.setTheme("light");
        }
    }

    getCurrentTheme(): Theme {
        return this.currentThemeSubject.value;
    }

    setTheme(theme: Theme): void {
        // Update the data-theme attribute on the document element
        document.documentElement.setAttribute("data-theme", theme);

        // Save to localStorage using the service
        this.localStorageService.setItem("theme", theme);

        // Update the subject
        this.currentThemeSubject.next(theme);
    }

    toggleTheme(): void {
        const currentTheme = this.getCurrentTheme();
        const newTheme: Theme = currentTheme === "light" ? "dark" : "light";
        this.setTheme(newTheme);
    }

    isDarkTheme(): boolean {
        return this.getCurrentTheme() === "dark";
    }

    isLightTheme(): boolean {
        return this.getCurrentTheme() === "light";
    }
} 