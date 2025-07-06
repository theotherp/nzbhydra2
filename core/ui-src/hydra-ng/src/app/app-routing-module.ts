import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {ConfigComponent} from "./views/config/config.component";
import {LoginComponent} from "./views/login/login.component";
import {SearchComponent} from "./views/search/search.component";
import {DownloadHistoryComponent} from "./views/stats/download-history.component";
import {IndexerStatusesComponent} from "./views/stats/indexer-statuses.component";
import {NotificationHistoryComponent} from "./views/stats/notification-history.component";
import {SearchHistoryComponent} from "./views/stats/search-history.component";
import {SystemComponent} from "./views/system/system.component";

// Generic route generator for tabbed sections
function createTabbedSectionRoutes(section: string, component: any, defaultTab: string): Routes {
    return [
        {path: section, redirectTo: `${section}/${defaultTab}`, pathMatch: "full"},
        {path: `${section}/:activeTab`, component}
    ];
}

const routes: Routes = [
    // Search routes
    {path: "", redirectTo: "/search", pathMatch: "full"},
    {path: "search", component: SearchComponent},

    // Config routes - generated generically
    ...createTabbedSectionRoutes("config", ConfigComponent, "main"),

    // Stats routes
    {
        path: "stats", children: [
            {path: "", redirectTo: "indexers", pathMatch: "full"},
            {path: "indexers", component: IndexerStatusesComponent},
            {path: "searches", component: SearchHistoryComponent},
            {path: "downloads", component: DownloadHistoryComponent},
            {path: "notifications", component: NotificationHistoryComponent}
        ]
    },

    // System routes
    {
        path: "system", children: [
            {path: "", redirectTo: "control", pathMatch: "full"},
            {path: "control", component: SystemComponent},
            {path: "updates", component: SystemComponent},
            {path: "log", component: SystemComponent},
            {path: "tasks", component: SystemComponent},
            {path: "backup", component: SystemComponent},
            {path: "bugreport", component: SystemComponent},
            {path: "news", component: SystemComponent},
            {path: "about", component: SystemComponent}
        ]
    },

    // Login route
    {path: "login", component: LoginComponent},

    // Catch all route
    {path: "**", redirectTo: "/search"}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
