import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {map, tap} from "rxjs/operators";
import {ApiHelpResponse, BaseConfig, CategoriesConfig, ConfigValidationResult, SafeConfig} from "../types/config.types";

// Types are now imported from ../types/config.types

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