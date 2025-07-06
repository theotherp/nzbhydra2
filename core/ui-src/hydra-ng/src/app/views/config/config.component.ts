import {Component, signal, ViewChild} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {BaseTabComponent} from "../../components/base-tab-component";
import {AuthConfigTabComponent} from "../../components/config/tabs/auth-config-tab/auth-config-tab.component";
import {CategoriesConfigTabComponent} from "../../components/config/tabs/categories-config-tab/categories-config-tab.component";
import {DownloadingConfigTabComponent} from "../../components/config/tabs/downloading-config-tab/downloading-config-tab.component";
import {IndexersConfigTabComponent} from "../../components/config/tabs/indexers-config-tab/indexers-config-tab.component";
import {MainConfigTabComponent} from "../../components/config/tabs/main-config-tab/main-config-tab.component";
import {NotificationsConfigTabComponent} from "../../components/config/tabs/notifications-config-tab/notifications-config-tab.component";
import {SearchingConfigTabComponent} from "../../components/config/tabs/searching-config-tab/searching-config-tab.component";
import {GenericTabNavigationService, TabConfig} from "../../services/generic-tab-navigation.service";
import {LocalStorageService} from "../../services/local-storage.service";
import {BaseConfig} from "../../types/config.types";

@Component({
    selector: "app-config",
    templateUrl: "./config.component.html",
    styleUrls: ["./config.component.css"],
    standalone: false
})
export class ConfigComponent extends BaseTabComponent {
    // Config-specific properties
    showAdvanced = signal(false);
    isLoading = signal(false);
    isSaving = signal(false);
    hasUnsavedChanges = signal(false);

    // Tab configuration
    readonly tabs: TabConfig[] = [
        {id: "main", label: "Main", route: "/config/main"},
        {id: "auth", label: "Authorization", route: "/config/auth"},
        {id: "searching", label: "Searching", route: "/config/searching"},
        {id: "categories", label: "Categories", route: "/config/categories"},
        {id: "downloading", label: "Downloading", route: "/config/downloading"},
        {id: "indexers", label: "Indexers", route: "/config/indexers"},
        {id: "notifications", label: "Notifications", route: "/config/notifications"}
    ];

    readonly section = "config";
    readonly defaultTab = "main";

    // ViewChild references to tab components
    @ViewChild(MainConfigTabComponent) mainConfigTab?: MainConfigTabComponent;
    @ViewChild(AuthConfigTabComponent) authConfigTab?: AuthConfigTabComponent;
    @ViewChild(SearchingConfigTabComponent) searchingConfigTab?: SearchingConfigTabComponent;
    @ViewChild(CategoriesConfigTabComponent) categoriesConfigTab?: CategoriesConfigTabComponent;
    @ViewChild(DownloadingConfigTabComponent) downloadingConfigTab?: DownloadingConfigTabComponent;
    @ViewChild(IndexersConfigTabComponent) indexersConfigTab?: IndexersConfigTabComponent;
    @ViewChild(NotificationsConfigTabComponent) notificationsConfigTab?: NotificationsConfigTabComponent;

    constructor(
        route: ActivatedRoute,
        private localStorageService: LocalStorageService,
        tabNavigationService: GenericTabNavigationService
    ) {
        super(route, tabNavigationService);
    }

    override ngOnInit() {
        console.log("ConfigComponent ngOnInit");
        console.log("Route snapshot in component:", this.route.snapshot);
        console.log("Route params in component:", this.route.snapshot.params);
        super.ngOnInit();
        this.loadAdvancedSetting();
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
        // Only set hasUnsavedChanges to true if there are actual changes
        // Check if any tab is actually dirty
        const anyTabDirty = this.checkIfAnyTabIsDirty();
        this.hasUnsavedChanges.set(anyTabDirty);
    }

    onFormValidChange(isValid: boolean) {
        // Handle form validation changes
    }

    private collectAllTabModels(): BaseConfig {
        const allModels: any = {};

        // Collect main config tab model
        allModels.main = this.mainConfigTab!.getCurrentModel();
        allModels.auth = this.authConfigTab!.getCurrentModel();
        // allModels.searching = this.searchingConfigTab!.getCurrentModel();
        // allModels.categories = this.categoriesConfigTab!.getCurrentModel();
        // allModels.downloading = this.downloadingConfigTab!.getCurrentModel();
        // allModels.indexers = this.indexersConfigTab!.getCurrentModel();
        // allModels.notifications = this.notificationsConfigTab!.getCurrentModel();

        return allModels;
    }

    private checkIfAnyTabIsDirty(): boolean {
        let isDirty = false;

        if (this.mainConfigTab?.isDirty()) {
            isDirty = true;
        }

        if (this.authConfigTab?.isDirty()) {
            isDirty = true;
        }
        // TODO: Check other tabs as they are created
        // if (this.searchingConfigTab?.isDirty()) {
        //     isDirty = true;
        // }
        // if (this.categoriesConfigTab?.isDirty()) {
        //     isDirty = true;
        // }
        // if (this.downloadingConfigTab?.isDirty()) {
        //     isDirty = true;
        // }
        // if (this.indexersConfigTab?.isDirty()) {
        //     isDirty = true;
        // }
        // if (this.notificationsConfigTab?.isDirty()) {
        //     isDirty = true;
        // }

        return isDirty;
    }

    private markAllTabsAsPristine() {
        this.mainConfigTab?.markAsPristine();
        this.authConfigTab?.markAsPristine();

        // TODO: Mark other tabs as pristine as they are created
        // this.searchingConfigTab?.markAsPristine();
        // this.categoriesConfigTab?.markAsPristine();
        // this.downloadingConfigTab?.markAsPristine();
        // this.indexersConfigTab?.markAsPristine();
        // this.notificationsConfigTab?.markAsPristine();
    }

    saveConfig() {
        if (!this.checkIfAnyTabIsDirty()) {
            console.log("No changes to save");
            return;
        }

        this.isSaving.set(true);

        // Collect all models from all tabs
        const allModels = this.collectAllTabModels();

        console.log("=== COLLECTED CONFIG MODELS ===");
        console.log("All tab models:", allModels);
        console.log("Main config model:", allModels.main);
        console.log("=== END COLLECTED MODELS ===");

        // TODO: Send to backend when all tabs are ready
        // this.configService.saveConfig(allModels).subscribe({
        //     next: () => {
        //         this.isSaving.set(false);
        //         this.hasUnsavedChanges.set(false);
        //         this.markAllTabsAsPristine();
        //         console.log("Configuration saved successfully");
        //     },
        //     error: (error) => {
        //         this.isSaving.set(false);
        //         console.error("Error saving config:", error);
        //     }
        // });

        // For now, just simulate saving
        setTimeout(() => {
            this.isSaving.set(false);
            this.hasUnsavedChanges.set(false);
            this.markAllTabsAsPristine();
            console.log("Configuration saved successfully (simulated)");
        }, 1000);
    }
} 