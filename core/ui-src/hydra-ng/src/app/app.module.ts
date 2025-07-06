import {HttpClientModule} from "@angular/common/http";
import {NgModule} from "@angular/core";
import {AbstractControl, FormsModule, ReactiveFormsModule, ValidationErrors} from "@angular/forms";
import {BrowserModule} from "@angular/platform-browser";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {RouterModule} from "@angular/router";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {FormlyBootstrapModule} from "@ngx-formly/bootstrap";
import {FormlyModule} from "@ngx-formly/core";
import Aura from "@primeuix/themes/aura";
import {AutoComplete} from "primeng/autocomplete";
import {Button} from "primeng/button";
import {Card} from "primeng/card";
import {Checkbox} from "primeng/checkbox";
import {providePrimeNG} from "primeng/config";
import {InputGroup} from "primeng/inputgroup";
import {InputGroupAddon} from "primeng/inputgroupaddon";
import {InputNumber} from "primeng/inputnumber";
import {InputText} from "primeng/inputtext";
import {Menubar} from "primeng/menubar";
import {Message} from "primeng/message";
import {ProgressSpinner} from "primeng/progressspinner";
import {Select} from "primeng/select";
import {SplitButton} from "primeng/splitbutton";
import {Tab, TabList, TabPanel, TabPanels, Tabs} from "primeng/tabs";
import {ToggleSwitchModule} from "primeng/toggleswitch";

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
import {FieldsetWrapperComponent} from "./components/config/wrappers/fieldset-wrapper.component";
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

export function IpValidator(control: AbstractControl): ValidationErrors {
    let isValid = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/.test(control.value) || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(control.value);
    return isValid ? {} : {"invalidIpAddress": true};
}
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
        NotificationsConfigTabComponent,
        // Config wrappers
        FieldsetWrapperComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
        NgbModule,
        FormlyModule.forRoot({
            validators: [
                {name: "ipAddress", validation: IpValidator},
                {name: "port", validation: () => ({value: true, message: "Invalid port number"})},
                {name: "apiKey", validation: () => ({value: true, message: "Invalid API key"})}
            ],
            validationMessages: [
                {name: "required", message: "This field is required"},
                {name: "invalidIpAddress", message: "Not a valid IP address"},
            ],
            wrappers: [
                {name: "fieldset", component: FieldsetWrapperComponent}
            ]
        }),
        FormlyBootstrapModule,
        RouterModule.forRoot([
            {path: "", redirectTo: "/search", pathMatch: "full"},
            {path: "search", component: SearchComponent},
            {path: "config", component: ConfigViewComponent},
            {path: "stats", component: StatsComponent},
            {path: "system", component: SystemComponent},
            {path: "login", component: LoginComponent}
        ]),
        AutoComplete,
        Button,
        Card,
        Checkbox,
        InputGroup,
        InputNumber,
        InputText,
        Menubar,
        Message,
        ProgressSpinner,
        Select,
        SplitButton,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        ToggleSwitchModule,
        InputGroupAddon
    ],
    providers: [
        MediaInfoService,
        SearchService,
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        })
    ],
    bootstrap: [App]
})
export class AppModule {
}