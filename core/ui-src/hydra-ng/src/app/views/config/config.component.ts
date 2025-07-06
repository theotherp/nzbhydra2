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
    activeTabIndex: string = "0";
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
            this.activeTabIndex = this.tabNameToIndex(tab).toString();
        }
    }

    private tabNameToIndex(tab: string): number {
        switch (tab) {
            case "main":
                return 0;
            case "auth":
                return 1;
            case "searching":
                return 2;
            case "categories":
                return 3;
            case "downloading":
                return 4;
            case "indexers":
                return 5;
            case "notifications":
                return 6;
            default:
                return 0;
        }
    }

    setActiveTabIndex(index: string | number) {
        this.activeTabIndex = index.toString();
    }

    private loadAdvancedSetting() {
        const savedAdvanced = this.localStorageService.getItem<boolean>("showAdvanced");
        this.showAdvanced.set(savedAdvanced ?? false);
    }

    toggleAdvanced() {
        this.showAdvanced.update(current => !current);
        this.localStorageService.setItem("showAdvanced", this.showAdvanced());
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