import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {map, tap} from "rxjs/operators";

export interface BaseConfig {
    main: MainConfig;
    auth: AuthConfig;
    searching: SearchConfig;
    categoriesConfig: CategoriesConfig;
    downloading: DownloadConfig;
    indexers: IndexerConfig[];
    notificationConfig: NotificationConfig;
}

export interface MainConfig {
    host: string;
    port: number;
    urlBase?: string;
    ssl: boolean;
    sslKeyStore?: string;
    sslKeyStorePassword?: string;
    proxyType: "NONE" | "SOCKS" | "HTTP";
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
    externalUrl?: string;
    apiKey: string;
    showAdvanced: boolean;
}

export interface AuthConfig {
    // Authentication configuration
}

export interface SearchConfig {
    // Search configuration
}

export interface Category {
    name: string;
    value: string;
    enabled: boolean;
    mayBeSelected?: boolean;
    searchType?: string;
    minSizePreset?: number;
    maxSizePreset?: number;
    ignoreResultsFrom?: string;
    preselect?: boolean;
}

export interface CategoriesConfig {
    enableCategorySizes: boolean;
    categories: Category[];
    defaultCategory: string;
}

export interface DownloadConfig {
    // Download configuration
}

export interface IndexerConfig {
    name: string;
    enabled: boolean;
    // Other indexer properties
}

export interface NotificationConfig {
    // Notification configuration
}

export interface SafeConfig {
    categoriesConfig: CategoriesConfig;
    authType: string;
    dereferer: string;
    searching: any;
    downloading: any;
    logging: any;
    notificationConfig: any;
    emby: any;
    showNews: boolean;
    keepHistory: boolean;
    indexers: any[];
}

export interface Downloader {
    name: string;
    downloaderType: string;
    enabled: boolean;
    defaultCategory?: string;
    iconCssClass?: string;
    categoriesConfig?: CategoriesConfig;
    indexers?: any[];
}

export interface ConfigValidationResult {
    ok: boolean;
    errorMessages: string[];
    warningMessages: string[];
    restartNeeded: boolean;
    newConfig?: BaseConfig;
}

export interface ApiHelpResponse {
    newznabApi: string;
    torznabApi: string;
    apiKey: string;
}

@Injectable({
    providedIn: "root"
})
export class ConfigService {
    private configSubject = new BehaviorSubject<SafeConfig | null>(null);
    private configLoaded = false;

    constructor(private http: HttpClient) {
    }

    getConfig(): Observable<BaseConfig> {
        return this.http.get<BaseConfig>("/internalapi/config");
    }

    setConfig(config: BaseConfig): Observable<ConfigValidationResult> {
        return this.http.put<ConfigValidationResult>("/internalapi/config", config);
    }

    getSafeConfig(): Observable<SafeConfig> {
        if (this.configLoaded && this.configSubject.value) {
            return new Observable(observer => {
                observer.next(this.configSubject.value!);
                observer.complete();
            });
        }

        return this.http.get<SafeConfig>("/internalapi/config/safe").pipe(
            tap(config => {
                this.configSubject.next(config);
                this.configLoaded = true;
            })
        );
    }

    reloadConfig(): Observable<any> {
        return this.http.get("/internalapi/config/reload");
    }

    getApiHelp(): Observable<ApiHelpResponse> {
        return this.http.get<ApiHelpResponse>("/internalapi/config/apiHelp");
    }

    getCategoriesConfig(): Observable<CategoriesConfig> {
        return this.getSafeConfig().pipe(
            map(config => config.categoriesConfig)
        );
    }

    getIndexers(): Observable<any[]> {
        return this.getSafeConfig().pipe(
            map(config => config.indexers)
        );
    }

    clearCache(): void {
        this.configSubject.next(null);
        this.configLoaded = false;
    }
} 