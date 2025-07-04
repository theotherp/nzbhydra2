import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {map, tap} from "rxjs/operators";

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

export interface CategoriesConfig {
    enableCategorySizes: boolean;
    categories: Category[];
    defaultCategory: string;
}

export interface Category {
    name: string;
    searchType?: string;
    minSizePreset?: number;
    maxSizePreset?: number;
    mayBeSelected: boolean;
    ignoreResultsFrom: string;
    preselect: boolean;
}

@Injectable({
    providedIn: "root"
})
export class ConfigService {
    private configSubject = new BehaviorSubject<SafeConfig | null>(null);
    private configLoaded = false;

    constructor(private http: HttpClient) {
    }

    getSafeConfig(): Observable<SafeConfig> {
        if (this.configLoaded && this.configSubject.value) {
            return new Observable(observer => {
                observer.next(this.configSubject.value!);
                observer.complete();
            });
        }

        return this.http.get<SafeConfig>("internalapi/config/safe").pipe(
            tap(config => {
                this.configSubject.next(config);
                this.configLoaded = true;
            })
        );
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