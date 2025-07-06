import {Component} from "@angular/core";
import {MenuItem} from "primeng/api";

@Component({
    selector: "app-root",
    templateUrl: "./app.html",
    standalone: false,
    styleUrl: "./app.scss"
})
export class App {
    protected title = "NZBHydra2";

    // Navigation properties (will be populated from service)
    showSearch = true;
    showStats = true;
    showAdmin = true;
    showLoginout = true;
    keepHistory = true;
    loginlogoutText = "Logout";

    menuItems: MenuItem[] = [
        {
            label: "Search",
            icon: "pi pi-search",
            routerLink: "/search",
            visible: this.showSearch
        },
        {
            label: this.keepHistory ? "History & Stats" : "Indexer statuses",
            icon: "pi pi-chart-bar",
            routerLink: "/stats",
            visible: this.showStats
        },
        {
            label: "Config",
            icon: "pi pi-cog",
            routerLink: "/config",
            visible: this.showAdmin
        },
        {
            label: "System",
            icon: "pi pi-server",
            routerLink: "/system",
            visible: this.showAdmin
        }
    ];

    loginout() {
        // TODO: Implement login/logout functionality
        console.log("Login/logout clicked");
    }
}
