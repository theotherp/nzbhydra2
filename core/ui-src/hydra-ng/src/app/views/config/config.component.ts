import {Component, OnInit, signal} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {ConfigService} from "../../services/config.service";
import {LocalStorageService} from "../../services/local-storage.service";

@Component({
    selector: "app-config",
    templateUrl: "./config.component.html",
    styleUrls: ["./config.component.css"],
    standalone: false
})
export class ConfigComponent implements OnInit {
    activeTab: string = "main";
    showAdvanced = signal(false);
    isLoading = signal(false);
    isSaving = signal(false);
    hasUnsavedChanges = signal(false);

    constructor(
        private route: ActivatedRoute,
        private configService: ConfigService,
        private localStorageService: LocalStorageService
    ) {
    }

    ngOnInit() {
        this.loadAdvancedSetting();
        
        // Determine active tab based on route
        const url = this.route.snapshot.url;
        if (url.length > 1) {
            const tab = url[1].path;
            this.activeTab = tab;
        }
    }

    private loadAdvancedSetting() {
        const savedAdvanced = this.localStorageService.getItem<boolean>("showAdvanced");
        this.showAdvanced.set(savedAdvanced ?? false);
    }

    toggleAdvanced() {
        this.showAdvanced.update(current => !current);
        this.localStorageService.setItem("showAdvanced", this.showAdvanced());
    }

    setActiveTab(tab: string) {
        console.log("Setting active tab to:", tab);
        this.activeTab = tab;
        console.log("Active tab is now:", this.activeTab);
    }

    onFormDirtyChange(isDirty: boolean) {
        this.hasUnsavedChanges.set(isDirty);
    }

    onFormValidChange(isValid: boolean) {
        // Handle form validation changes
    }

    saveConfig() {
        if (!this.hasUnsavedChanges()) {
            return;
        }

        this.isSaving.set(true);

        // TODO: Collect all form data from tabs and save
        // For now, just simulate saving
        setTimeout(() => {
            this.isSaving.set(false);
            this.hasUnsavedChanges.set(false);
            console.log("Configuration saved successfully");
        }, 1000);
    }
} 