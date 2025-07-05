import {HttpClientModule} from "@angular/common/http";
import {NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BrowserModule} from "@angular/platform-browser";
import {RouterModule} from "@angular/router";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";

import {App} from "./app";
import {IndexerStatusesComponent} from "./components/indexer-statuses/indexer-statuses.component";
import {SearchResultsComponent} from "./components/search-results/search-results.component";
import {SearchStatusModalComponent} from "./components/search-status-modal/search-status-modal.component";
import {ThemeToggleComponent} from "./components/theme-toggle/theme-toggle.component";
import {MediaInfoService} from "./services/media-info.service";
import {SearchService} from "./services/search.service";
import {ConfigComponent} from "./views/config/config.component";
import {LoginComponent} from "./views/login/login.component";
import {SearchComponent} from "./views/search/search.component";
import {StatsComponent} from "./views/stats/stats.component";
import {SystemComponent} from "./views/system/system.component";

@NgModule({
    declarations: [
        App,
        SearchComponent,
        ConfigComponent,
        StatsComponent,
        SystemComponent,
        LoginComponent,
        SearchResultsComponent,
        IndexerStatusesComponent,
        SearchStatusModalComponent,
        ThemeToggleComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
        NgbModule,
        RouterModule.forRoot([
            {path: "", redirectTo: "/search", pathMatch: "full"},
            {path: "search", component: SearchComponent},
            {path: "config", component: ConfigComponent},
            {path: "stats", component: StatsComponent},
            {path: "system", component: SystemComponent},
            {path: "login", component: LoginComponent}
        ])
    ],
    providers: [MediaInfoService, SearchService],
    bootstrap: [App]
})
export class AppModule {
}