import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {filter, map} from "rxjs/operators";
import {ApiHelpResponse, BaseConfig, CategoriesConfig, ConfigValidationResult, SafeConfig} from "../types/config.types";

// Types are now imported from ../types/config.types

@Injectable({
    providedIn: "root"
})
export class ConfigService {
    private configSubject = new BehaviorSubject<SafeConfig | null>(null);
    private configLoaded = false;
    private configLoading = false;

    constructor(private http: HttpClient) {
        this.initializeConfig();
    }

    private initializeConfig(): void {
        // Use server-injected config if available (Spring Boot)
        if (typeof window !== "undefined" && (window as any).__SAFE_CONFIG__) {
            this.configSubject.next((window as any).__SAFE_CONFIG__);
            this.configLoaded = true;
        } else {
            // Fallback: load from API (ng serve)
            this.loadConfig();
        }
    }

    private loadConfig(): void {
        if (this.configLoading || this.configLoaded) {
            return;
        }

        this.configLoading = true;
        this.http.get<SafeConfig>("/internalapi/config/safe").subscribe({
            next: (config) => {
                this.configSubject.next(config);
                this.configLoaded = true;
                this.configLoading = false;
            },
            error: () => {
                this.configLoading = false;
            }
        });
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

        // If config is still loading, wait for it
        if (this.configLoading) {
            return this.configSubject.asObservable().pipe(
                filter(config => config !== null),
                map(config => config!)
            );
        }

        // If config hasn't been loaded yet, load it now
        this.loadConfig();
        return this.configSubject.asObservable().pipe(
            filter(config => config !== null),
            map(config => config!)
        );
    }

    reloadConfig(): Observable<any> {
        return this.http.get("/internalapi/config/reload").pipe(
            map(() => {
                this.loadConfig();
            })
        );
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
        this.configLoading = false;
    }

    // Method to force reload config (useful when config is changed)
    forceReloadConfig(): void {
        this.clearCache();
        this.loadConfig();
    }
} 