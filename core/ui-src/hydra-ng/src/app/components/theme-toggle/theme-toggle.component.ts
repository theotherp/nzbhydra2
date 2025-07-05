import {Component} from "@angular/core";
import {ThemeService} from "../../services/theme.service";

@Component({
    selector: "app-theme-toggle",
    template: `
      <button
        class="btn btn-outline-secondary btn-sm theme-toggle-btn"
        (click)="toggleTheme()"
        [attr.aria-label]="'Switch to ' + (isDarkTheme() ? 'light' : 'dark') + ' theme'"
        title="Toggle theme">
        <i class="bi" [class.bi-sun]="isDarkTheme()" [class.bi-moon]="!isDarkTheme()"></i>
        {{ isDarkTheme() ? 'Light' : 'Dark' }}
      </button>
    `,
    styleUrls: ["./theme-toggle.component.scss"],
    standalone: false
})
export class ThemeToggleComponent {
    constructor(private themeService: ThemeService) {
    }

    toggleTheme(): void {
        this.themeService.toggleTheme();
    }

    isDarkTheme(): boolean {
        return this.themeService.isDarkTheme();
    }
} 