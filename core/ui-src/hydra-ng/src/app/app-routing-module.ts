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

const routes: Routes = [
    // Search routes
    {path: "", redirectTo: "/search", pathMatch: "full"},
    {path: "search", component: SearchComponent},

    // Config routes
    {
        path: "config/:activeTab", component: ConfigComponent
        // children: [
        //     {path: "", redirectTo: "main", pathMatch: "full"},
        //     {path: "main", component: ConfigComponent, data: {activeTab: 0}},
        //     {path: "auth", component: ConfigComponent, data: {activeTab: 1}},
        //     {path: "searching", component: ConfigComponent, data: {activeTab: 2}},
        //     {path: "categories", component: ConfigComponent, data: {activeTab: 3}},
        //     {path: "downloading", component: ConfigComponent, data: {activeTab: 4}},
        //     {path: "indexers", component: ConfigComponent, data: {activeTab: 5}},
        //     {path: "notifications", component: ConfigComponent, data: {activeTab: 6}}
        // ]
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
