import {HttpClientModule} from "@angular/common/http";
import {NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BrowserModule} from "@angular/platform-browser";
import {RouterModule} from "@angular/router";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {FormlyBootstrapModule} from "@ngx-formly/bootstrap";
import {FormlyModule} from "@ngx-formly/core";

import {App} from "./app";
import {AddableNzbComponent} from "./components/addable-nzb/addable-nzb.component";
import {CategorySelectionModalComponent} from "./components/category-selection-modal/category-selection-modal.component";

import {AuthConfigTabComponent} from "./components/config/tabs/auth-config-tab/auth-config-tab.component";
import {CategoriesConfigTabComponent} from "./components/config/tabs/categories-config-tab/categories-config-tab.component";
import {DownloadingConfigTabComponent} from "./components/config/tabs/downloading-config-tab/downloading-config-tab.component";
import {IndexersConfigTabComponent} from "./components/config/tabs/indexers-config-tab/indexers-config-tab.component";
import {MainConfigTabComponent} from "./components/config/tabs/main-config-tab/main-config-tab.component";
import {NotificationsConfigTabComponent} from "./components/config/tabs/notifications-config-tab/notifications-config-tab.component";
import {SearchingConfigTabComponent} from "./components/config/tabs/searching-config-tab/searching-config-tab.component";
import {IndexerStatusesComponent} from "./components/indexer-statuses/indexer-statuses.component";
import {SaveOrSendFileComponent} from "./components/save-or-send-file/save-or-send-file.component";
import {SearchResultsComponent} from "./components/search-results/search-results.component";
import {SearchStatusModalComponent} from "./components/search-status-modal/search-status-modal.component";
import {ThemeToggleComponent} from "./components/theme-toggle/theme-toggle.component";
import {MediaInfoService} from "./services/media-info.service";
import {SearchService} from "./services/search.service";
import {ConfigComponent as ConfigViewComponent} from "./views/config/config.component";
import {LoginComponent} from "./views/login/login.component";
import {SearchComponent} from "./views/search/search.component";
import {StatsComponent} from "./views/stats/stats.component";
import {SystemComponent} from "./views/system/system.component";

@NgModule({
    declarations: [
        App,
        SearchComponent,
        ConfigViewComponent,
        StatsComponent,
        SystemComponent,
        LoginComponent,
        AddableNzbComponent,
        CategorySelectionModalComponent,
        IndexerStatusesComponent,
        SaveOrSendFileComponent,
        SearchResultsComponent,
        SearchStatusModalComponent,
        ThemeToggleComponent,
        // Config components
        MainConfigTabComponent,
        AuthConfigTabComponent,
        SearchingConfigTabComponent,
        CategoriesConfigTabComponent,
        DownloadingConfigTabComponent,
        IndexersConfigTabComponent,
        NotificationsConfigTabComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
        NgbModule,
        FormlyModule.forRoot(),
        FormlyBootstrapModule,
        RouterModule.forRoot([
            {path: "", redirectTo: "/search", pathMatch: "full"},
            {path: "search", component: SearchComponent},
            {path: "config", component: ConfigViewComponent},
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