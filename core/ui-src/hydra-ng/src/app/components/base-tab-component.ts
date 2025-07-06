import {Directive, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {GenericTabNavigationService, TabConfig} from "../services/generic-tab-navigation.service";

@Directive()
export abstract class BaseTabComponent implements OnInit {
    activeTabId: string = "";

    // Abstract properties that must be implemented by child classes
    abstract readonly tabs: TabConfig[];
    abstract readonly section: string;
    abstract readonly defaultTab: string;

    constructor(
        protected route: ActivatedRoute,
        protected tabNavigationService: GenericTabNavigationService
    ) {
    }

    ngOnInit() {
        // Initialize tab navigation with route parameters from the component
        const routeParams = this.route.snapshot.params;
        this.tabNavigationService.initializeTabs(this.section, this.tabs, this.defaultTab, routeParams);

        // Subscribe to active tab changes
        this.tabNavigationService.activeTab$.subscribe((activeTab: string) => {
            this.activeTabId = activeTab;
        });
    }

    setActiveTab(tabId: string | number): void {
        const tabIdString = tabId.toString();
        this.tabNavigationService.onTabChange(tabIdString, this.section);
    }
} 