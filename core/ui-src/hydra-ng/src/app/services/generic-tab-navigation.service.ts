import {Injectable} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import {BehaviorSubject} from "rxjs";

export interface TabConfig {
    id: string;
    label: string;
    route: string;
}

@Injectable({
    providedIn: "root"
})
export class GenericTabNavigationService {
    private activeTabSubject = new BehaviorSubject<string>("");
    public activeTab$ = this.activeTabSubject.asObservable();

    constructor(
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    /**
     * Initialize tab navigation for a section
     * @param section The section name (e.g., 'config', 'system', 'stats')
     * @param tabs Array of tab configurations
     * @param defaultTab Default tab to use if none specified in URL
     * @param routeParams Optional route parameters from the component
     */
    initializeTabs(section: string, tabs: TabConfig[], defaultTab: string, routeParams?: any): void {
        // Get the active tab from route parameter (prefer passed params, fallback to service route)
        const params = routeParams || this.route.snapshot.params;
        const activeTab = params["activeTab"] || defaultTab;
        console.log(`Initializing tabs for section: ${section}`);
        console.log(`Current URL:`, this.router.url);
        console.log(`Route params:`, params);
        console.log(`Active tab from route: ${activeTab}`);
        console.log(`Available tabs:`, tabs.map(t => t.id));
        this.setActiveTab(activeTab);
    }

    /**
     * Set active tab and update the subject
     * @param tabId Tab identifier
     */
    setActiveTab(tabId: string): void {
        this.activeTabSubject.next(tabId);
    }

    /**
     * Get current active tab
     */
    getActiveTab(): string {
        return this.activeTabSubject.value;
    }

    /**
     * Handle tab change from PrimeNG tabs
     * @param tabId Tab ID as string
     * @param section The section name
     */
    onTabChange(tabId: string, section: string): void {
        this.navigateToTab(section, tabId);
    }

    /**
     * Navigate to a specific tab
     * @param section The section name
     * @param tabId Tab identifier
     */
    navigateToTab(section: string, tabId: string): void {
        this.router.navigate([`/${section}`, tabId]);
    }
} 