import {NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {ReactiveFormsModule, FormsModule} from "@angular/forms";
import {RouterModule} from "@angular/router";
import {HttpClientModule} from "@angular/common/http";

import {App} from "./app";
import {SearchComponent} from "./views/search/search.component";
import {ConfigComponent} from "./views/config/config.component";
import {StatsComponent} from "./views/stats/stats.component";
import {SystemComponent} from "./views/system/system.component";
import {LoginComponent} from "./views/login/login.component";
import {SearchResultsComponent} from "./components/search-results/search-results.component";
import {MediaInfoService} from "./services/media-info.service";
import {SearchService} from "./services/search.service";

@NgModule({
    declarations: [
        App,
        SearchComponent,
        ConfigComponent,
        StatsComponent,
        SystemComponent,
        LoginComponent,
        SearchResultsComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
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