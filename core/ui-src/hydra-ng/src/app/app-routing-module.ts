import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {SearchComponent} from "./views/search/search.component";
import {ConfigComponent} from "./views/config/config.component";
import {IndexerStatusesComponent} from "./views/stats/indexer-statuses.component";
import {SearchHistoryComponent} from "./views/stats/search-history.component";
import {DownloadHistoryComponent} from "./views/stats/download-history.component";
import {NotificationHistoryComponent} from "./views/stats/notification-history.component";
import {SystemComponent} from "./views/system/system.component";
import {LoginComponent} from "./views/login/login.component";

const routes: Routes = [
    // Search routes
    {path: "", redirectTo: "/search", pathMatch: "full"},
    {path: "search", component: SearchComponent},

    // Config routes
    {
        path: "config", children: [
            {path: "", redirectTo: "main", pathMatch: "full"},
            {path: "main", component: ConfigComponent},
            {path: "auth", component: ConfigComponent},
            {path: "searching", component: ConfigComponent},
            {path: "categories", component: ConfigComponent},
            {path: "downloading", component: ConfigComponent},
            {path: "indexers", component: ConfigComponent},
            {path: "notifications", component: ConfigComponent}
        ]
    },

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
